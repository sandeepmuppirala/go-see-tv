/**
 * `GET /unsubscribe?token=...` — no login required (ADR-027, the UX
 * review's requirement). The token is a signed favorite id
 * (unsubscribe-token.ts); verifying it does not require knowing who
 * the user is, only that this specific link was genuinely issued by
 * this app for this specific favorite row.
 */
import { createServiceClient } from "@/lib/supabase/service";
import { verifyToken } from "@/lib/unsubscribe-token";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) return htmlResponse("Missing unsubscribe link token.", 400);

  const favoriteId = verifyToken(token);
  if (!favoriteId) return htmlResponse("This unsubscribe link is invalid or has expired.", 400);

  const supabase = createServiceClient();
  if (!supabase) return htmlResponse("Unsubscribe is temporarily unavailable. Please try again later.", 503);

  const { data: favorite } = await supabase.from("favorites").select("label").eq("id", favoriteId).maybeSingle();
  await supabase.from("favorites").delete().eq("id", favoriteId);

  return htmlResponse(favorite ? `You've been unfollowed from ${favorite.label}. No more emails for this team.` : "Done — you won't receive any more emails for this favorite.", 200);
}

function htmlResponse(message: string, status: number): Response {
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>VELA — Unsubscribe</title></head><body style="font-family:system-ui;background:#090b14;color:#f6f6fa;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;padding:24px;text-align:center"><p style="max-width:420px">${message}</p></body></html>`;
  return new Response(html, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}
