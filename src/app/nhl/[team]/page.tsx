import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, ShieldCheck, Tv2 } from "lucide-react";
import { NHL_TEAMS, findNhlTeam } from "@/lib/nhl-teams";
import { nhl } from "@/lib/nhl";
import { FollowTeamToggle } from "./follow-team-toggle";

export const revalidate = 900;

const dateToday = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

export function generateStaticParams() {
  return NHL_TEAMS.map((t) => ({ team: t.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ team: string }> }): Promise<Metadata> {
  const { team: teamSlug } = await params;
  const team = findNhlTeam(teamSlug);
  if (!team) return { title: "Team not found | VELA" };
  return {
    title: `What channel is the ${team.fullName} game on tonight? | VELA`,
    description: `Tonight's TV channel and streaming listing for the ${team.fullName}, for Canada and the US, sourced directly from the NHL schedule feed.`,
    alternates: { canonical: `/nhl/${team.slug}` },
  };
}

export default async function NhlTeamPage({ params }: { params: Promise<{ team: string }> }) {
  const { team: teamSlug } = await params;
  const team = findNhlTeam(teamSlug);
  if (!team) {
    return (
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "60px 24px", color: "#f6f6fa" }}>
        <h1>Team not found</h1>
        <p>
          <Link href="/">Back to tonight&apos;s full guide</Link>
        </p>
      </main>
    );
  }

  const date = dateToday();
  let game = null;
  let fetchFailed = false;
  try {
    const games = await nhl(date, "BOTH");
    game = games.find((g) => g.name.includes(team.fullName)) ?? null;
  } catch {
    // Do not fabricate a game or a "no game today" claim when the source itself failed.
    fetchFailed = true;
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "60px 24px", color: "#f6f6fa", lineHeight: 1.65 }}>
      <p style={{ color: "#a78bfa", fontSize: 13, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>VELA · {team.fullName}</p>
      <h1 style={{ fontSize: "clamp(26px,4.5vw,40px)", letterSpacing: -1, margin: "12px 0 24px" }}>
        What channel is the {team.fullName} game on tonight?
      </h1>

      {fetchFailed ? (
        <div className="empty">
          <div className="emptyIcon">
            <Tv2 size={28} />
          </div>
          <h3>Schedule temporarily unavailable</h3>
          <p>The NHL&apos;s schedule feed didn&apos;t respond. Try again shortly, or check the full guide below.</p>
        </div>
      ) : game ? (
        <article className={game.state === "in" ? "event eventLive" : "event"}>
          {game.state === "in" ? (
            <span className="liveBadge">
              <span className="liveDot" /> LIVE
            </span>
          ) : null}
          <h3>{game.name}</h3>
          {game.awayScore !== undefined && game.homeScore !== undefined ? (
            <p className="scoreLine">
              {game.awayScore} – {game.homeScore}
            </p>
          ) : null}
          <p>
            {game.state === "in" && game.stateDetail
              ? game.stateDetail
              : new Date(game.startsAt).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Toronto" }) + " ET"}
          </p>
          <p className="channelLabel">TV channels / services</p>
          {(["CA", "US"] as const).map((region) => (
            <div key={region}>
              <p className="channelLabel">{region === "CA" ? "🇨🇦 Canada" : "🇺🇸 United States"}</p>
              {game!.channelsByCountry[region].length ? (
                <div className="channelList">
                  {game!.channelsByCountry[region].map((c) => (
                    <span className="channelChip" key={region + c}>
                      {c}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="channelUnknown">No channel provided for {region === "CA" ? "Canada" : "the US"} by this feed</p>
              )}
            </div>
          ))}
          <div className="options">
            <a href={game.sourceUrl} target="_blank" rel="noopener noreferrer">
              Check {game.source} <ArrowUpRight size={14} />
            </a>
          </div>
          <small>Broadcast rights may vary by region and subscription.</small>
        </article>
      ) : (
        <div className="empty">
          <div className="emptyIcon">
            <Tv2 size={28} />
          </div>
          <h3>No {team.fullName} game on {date}</h3>
          <p>Check the full guide for tonight&apos;s other games, or check back on their next game day.</p>
        </div>
      )}

      <div className="trust" style={{ marginTop: 28 }}>
        <ShieldCheck size={17} /> Schedules and channel listings are sourced directly from the NHL. We won&apos;t invent a network assignment this feed doesn&apos;t supply.
      </div>

      <FollowTeamToggle slug={team.slug} label={team.fullName} />

      <p style={{ marginTop: 32 }}>
        <Link href="/" style={{ color: "#a78bfa", fontWeight: 700 }}>
          See every game on tonight &rarr;
        </Link>
      </p>
    </main>
  );
}
