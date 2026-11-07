/**
 * Extracted out of `api/broadcasts/route.ts` so the NHL team SEO pages
 * (`app/nhl/[team]/page.tsx`) can call the same fetch/normalize logic
 * directly, in-process, instead of either duplicating it or doing an
 * HTTP round-trip to this app's own API route (which would need an
 * absolute URL during static generation). A `route.ts` file may only
 * export HTTP-method handlers and Next's route-config constants --
 * Next's own build-time type check rejects any other export from it
 * (confirmed directly: "X is not a valid Route export field") -- so
 * this logic has to live outside `route.ts` for a second caller to
 * reuse it at all.
 */
export type Country = 'CA' | 'US' | 'BOTH';
export type GameState = 'pre' | 'in' | 'post';
export type Gender = 'men' | 'women';
export type Game = {
  id: string;
  name: string;
  sport: string;
  league: string;
  startsAt: string;
  channels: string[];
  channelsByCountry: { CA: string[]; US: string[] };
  channelStatus: 'listed' | 'unavailable';
  state: GameState;
  stateDetail?: string;
  awayScore?: number;
  homeScore?: number;
  scoreText?: string;
  gender: Gender;
  source: string;
  sourceUrl: string;
};
type NHLGame = {
  id: number;
  startTimeUTC: string;
  gameState?: string;
  awayTeam?: { placeName?: { default?: string }; commonName?: { default?: string }; abbrev?: string; score?: number };
  homeTeam?: { placeName?: { default?: string }; commonName?: { default?: string }; abbrev?: string; score?: number };
  tvBroadcasts?: { countryCode?: string; network?: string }[];
};
const nhlState = (s?: string): GameState => (s === 'FUT' || s === 'PRE' ? 'pre' : s === 'OFF' || s === 'FINAL' ? 'post' : 'in');
const nhlName = (t: NHLGame['homeTeam']) => [t?.placeName?.default, t?.commonName?.default].filter(Boolean).join(' ') || t?.abbrev || 'TBD';

export async function nhl(date: string, country: Country): Promise<Game[]> {
  // NHL's score endpoint provides per-game tvBroadcasts; schedule responses can omit them.
  const [scoreResult, scheduleResult] = await Promise.allSettled([
    fetch('https://api-web.nhle.com/v1/score/' + date, { next: { revalidate: 900 }, signal: AbortSignal.timeout(9000) }),
    fetch('https://api-web.nhle.com/v1/schedule/' + date, { next: { revalidate: 900 }, signal: AbortSignal.timeout(9000) }),
  ]);
  let scoreGames: NHLGame[] = [];
  if (scoreResult.status === 'fulfilled' && scoreResult.value.ok) {
    const data = (await scoreResult.value.json()) as { games?: NHLGame[] };
    scoreGames = data.games || [];
  }
  let scheduleGames: NHLGame[] = [];
  if (scheduleResult.status === 'fulfilled' && scheduleResult.value.ok) {
    const data = (await scheduleResult.value.json()) as { gameWeek?: { date: string; games?: NHLGame[] }[] };
    scheduleGames = data.gameWeek?.find((w) => w.date === date)?.games || [];
  }
  if (scoreResult.status === 'rejected' && scheduleResult.status === 'rejected') throw Error('NHL feeds unavailable');
  if (
    !scoreGames.length &&
    !scheduleGames.length &&
    !(scoreResult.status === 'fulfilled' && scoreResult.value.ok) &&
    !(scheduleResult.status === 'fulfilled' && scheduleResult.value.ok)
  )
    throw Error('NHL feeds unavailable');
  // The score endpoint's team objects carry only `abbrev` (no
  // placeName/commonName) — found while building the NHL team pages,
  // which need the real full name to match a team. A flat
  // `{...existing, ...game}` replaces `existing.awayTeam`/`homeTeam`
  // wholesale with the score endpoint's leaner version, silently
  // dropping the schedule endpoint's full name for every game once the
  // score feed has anything to say about it (i.e. most games, most of
  // the day) -- this was already degrading the main guide's own
  // display to "UTA vs OTT" instead of "Utah Mammoth vs Ottawa
  // Senators", not something this page introduced.
  const mergeTeam = (existing: NHLGame['awayTeam'], latest: NHLGame['awayTeam']): NHLGame['awayTeam'] => ({
    ...latest,
    ...existing,
    score: latest?.score ?? existing?.score,
  });
  const byId = new Map<number, NHLGame>();
  for (const game of scheduleGames) byId.set(game.id, game);
  for (const game of scoreGames) {
    const existing = byId.get(game.id);
    byId.set(game.id, {
      ...existing,
      ...game,
      tvBroadcasts: game.tvBroadcasts?.length ? game.tvBroadcasts : existing?.tvBroadcasts,
      awayTeam: mergeTeam(existing?.awayTeam, game.awayTeam),
      homeTeam: mergeTeam(existing?.homeTeam, game.homeTeam),
    });
  }
  return [...byId.values()].map((g) => {
    const channels = [
      ...new Set(
        (g.tvBroadcasts || [])
          .filter((b) => (country === 'BOTH' || b.countryCode?.toUpperCase() === country) && b.network?.trim())
          .map((b) => b.network!.trim())
      ),
    ];
    const channelsByCountry = {
      CA: [...new Set((g.tvBroadcasts || []).filter((b) => b.countryCode?.toUpperCase() === 'CA' && b.network?.trim()).map((b) => b.network!.trim()))],
      US: [...new Set((g.tvBroadcasts || []).filter((b) => b.countryCode?.toUpperCase() === 'US' && b.network?.trim()).map((b) => b.network!.trim()))],
    };
    const state = nhlState(g.gameState);
    // A score only means something once the game has actually started —
    // showing "0-0" for a game that hasn't started yet would read as a
    // real (if boring) result rather than "nothing has happened".
    const hasScore = state !== 'pre' && typeof g.awayTeam?.score === 'number' && typeof g.homeTeam?.score === 'number';
    return {
      channelsByCountry,
      id: 'nhl-' + g.id,
      name: nhlName(g.awayTeam) + ' vs ' + nhlName(g.homeTeam),
      sport: 'Hockey',
      league: 'NHL',
      startsAt: g.startTimeUTC,
      channels,
      channelStatus: channels.length ? 'listed' : 'unavailable',
      state,
      awayScore: hasScore ? g.awayTeam!.score : undefined,
      homeScore: hasScore ? g.homeTeam!.score : undefined,
      gender: 'men',
      source: 'NHL score/schedule',
      sourceUrl: 'https://www.nhl.com/schedule',
    };
  });
}
