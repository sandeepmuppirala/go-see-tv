/**
 * VELA's first-ever scheduled/background-compute mechanism (ADR-027) —
 * a structural first for this product (previously pure request-time
 * serverless, no cron, no worker). Triggered by Vercel Cron
 * (vercel.json's `crons` entry), protected by a secret header check
 * from day one: this route's blast radius (emailing every matched
 * user) means it must never be a publicly POST-able trigger, per the
 * spirit of go-see-events' threat-model.md §7 (tightest limits on the
 * highest-blast-radius endpoints) even though final sign-off on that
 * is a security review's call, not made unilaterally here.
 *
 * V1 scope: exactly the 32 NHL_TEAMS, matched against today's live NHL
 * schedule (the same `nhl()` function and team-name match the
 * /nhl/[team] page itself uses) -- never a live call fanned out beyond
 * what a single day's schedule fetch already costs. Three-outcome
 * honesty inherited from the team page verbatim: channel confirmed /
 * no channel for a region / feed failed entirely -> skip the send, never
 * guess.
 */
import { createServiceClient } from "@/lib/supabase/service";
import { nhl } from "@/lib/nhl";
import { sendEmail } from "@/lib/email";
import { signFavoriteId } from "@/lib/unsubscribe-token";

export const dynamic = "force-dynamic";

function dateToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

async function eventKeyHash(gameId: string, date: string): Promise<string> {
  const data = new TextEncoder().encode(`${gameId}:${date}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function buildEmail(teamLabel: string, gameName: string, channelsCA: string[], channelsUS: string[], favoriteId: string): { subject: string; html: string; text: string } {
  // "plays today", not "is about to start" -- this cron runs once per
  // day (vercel.json), so the honest claim is day-level, not minute-
  // level. Never overstate timing precision the actual cadence doesn't
  // have.
  const subject = `${teamLabel} plays today: ${gameName}`;
  const channelLine = (region: string, channels: string[]) =>
    channels.length ? `${region}: ${channels.join(", ")}` : `${region}: not yet listed by this feed — check back closer to puck drop`;
  // Unsubscribe link is per-favorite and no-login-required (UX review
  // requirement). A missing UNSUBSCRIBE_SECRET degrades to no link
  // rather than a broken one -- never send a link that would 400.
  const token = signFavoriteId(favoriteId);
  const unsubscribeUrl = token ? `https://go-see-tv.vercel.app/unsubscribe?token=${encodeURIComponent(token)}` : null;
  const unsubscribeHtml = unsubscribeUrl ? `<p style="font-size:12px;color:#888"><a href="${unsubscribeUrl}">Stop emails for ${teamLabel}</a></p>` : "";
  const unsubscribeText = unsubscribeUrl ? `\n\nStop emails for ${teamLabel}: ${unsubscribeUrl}` : "";
  const html = `<p><strong>${gameName}</strong> plays today.</p><p>${channelLine("Canada", channelsCA)}<br/>${channelLine("United States", channelsUS)}</p><p><a href="https://go-see-tv.vercel.app/">Check the full guide</a></p>${unsubscribeHtml}`;
  const text = `${gameName} plays today.\n${channelLine("Canada", channelsCA)}\n${channelLine("United States", channelsUS)}\n\nFull guide: https://go-see-tv.vercel.app/${unsubscribeText}`;
  return { subject, html, text };
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return Response.json({ error: "CRON_SECRET is not configured — refusing to run" }, { status: 503 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  if (!supabase) {
    return Response.json({ error: "SUPABASE_SERVICE_ROLE_KEY is not configured — refusing to run" }, { status: 503 });
  }

  const date = dateToday();
  let games;
  try {
    games = await nhl(date, "BOTH");
  } catch {
    // The feed itself failed -- never guess, skip this entire run.
    return Response.json({ matchesFound: 0, emailsSent: 0, note: "NHL feed unavailable this run" }, { status: 200 });
  }

  const { data: favorites, error: favoritesError } = await supabase.from("favorites").select("id, user_id, target_key, label").eq("product", "vela");
  if (favoritesError) {
    return Response.json({ error: favoritesError.message }, { status: 500 });
  }

  let matchesFound = 0;
  let emailsSent = 0;

  for (const favorite of favorites ?? []) {
    const game = games.find((g) => g.name.includes(favorite.label));
    if (!game) continue;
    matchesFound += 1;

    const keyHash = await eventKeyHash(game.id, date);
    const { data: alreadySent } = await supabase
      .from("favorite_notifications_sent")
      .select("id")
      .eq("favorite_id", favorite.id)
      .eq("event_key_hash", keyHash)
      .maybeSingle();
    if (alreadySent) continue;

    const { data: userData } = await supabase.auth.admin.getUserById(favorite.user_id);
    const email = userData?.user?.email;
    if (!email) continue;

    const { subject, html, text } = buildEmail(favorite.label, game.name, game.channelsByCountry.CA, game.channelsByCountry.US, favorite.id);
    const result = await sendEmail({ to: email, subject, html, text });
    if (result.sent) {
      await supabase.from("favorite_notifications_sent").insert({ favorite_id: favorite.id, user_id: favorite.user_id, event_key_hash: keyHash });
      emailsSent += 1;
    }
  }

  return Response.json({ matchesFound, emailsSent }, { status: 200 });
}
