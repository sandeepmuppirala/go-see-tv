/**
 * Slugs and the exact full names the NHL schedule API itself produces
 * (`placeName.default + ' ' + commonName.default`, verified directly
 * against `api-web.nhle.com/v1/schedule/now` rather than typed from
 * memory -- team names, spelling, and composition change over time,
 * e.g. the Arizona Coyotes relocating to become the Utah Mammoth).
 * `fullName` is matched as a substring of `Game.name` ("{away} vs
 * {home}"), which `route.ts`'s `nhlName()` always builds from these
 * same two fields -- keeping one source of truth instead of a second,
 * driftable copy of team-name logic.
 */
export interface NhlTeam {
  slug: string;
  fullName: string;
  abbrev: string;
}

export const NHL_TEAMS: NhlTeam[] = [
  { slug: "anaheim-ducks", fullName: "Anaheim Ducks", abbrev: "ANA" },
  { slug: "boston-bruins", fullName: "Boston Bruins", abbrev: "BOS" },
  { slug: "buffalo-sabres", fullName: "Buffalo Sabres", abbrev: "BUF" },
  { slug: "calgary-flames", fullName: "Calgary Flames", abbrev: "CGY" },
  { slug: "carolina-hurricanes", fullName: "Carolina Hurricanes", abbrev: "CAR" },
  { slug: "chicago-blackhawks", fullName: "Chicago Blackhawks", abbrev: "CHI" },
  { slug: "colorado-avalanche", fullName: "Colorado Avalanche", abbrev: "COL" },
  { slug: "columbus-blue-jackets", fullName: "Columbus Blue Jackets", abbrev: "CBJ" },
  { slug: "dallas-stars", fullName: "Dallas Stars", abbrev: "DAL" },
  { slug: "detroit-red-wings", fullName: "Detroit Red Wings", abbrev: "DET" },
  { slug: "edmonton-oilers", fullName: "Edmonton Oilers", abbrev: "EDM" },
  { slug: "florida-panthers", fullName: "Florida Panthers", abbrev: "FLA" },
  { slug: "los-angeles-kings", fullName: "Los Angeles Kings", abbrev: "LAK" },
  { slug: "minnesota-wild", fullName: "Minnesota Wild", abbrev: "MIN" },
  { slug: "montreal-canadiens", fullName: "Montréal Canadiens", abbrev: "MTL" },
  { slug: "nashville-predators", fullName: "Nashville Predators", abbrev: "NSH" },
  { slug: "new-jersey-devils", fullName: "New Jersey Devils", abbrev: "NJD" },
  { slug: "new-york-islanders", fullName: "New York Islanders", abbrev: "NYI" },
  { slug: "new-york-rangers", fullName: "New York Rangers", abbrev: "NYR" },
  { slug: "ottawa-senators", fullName: "Ottawa Senators", abbrev: "OTT" },
  { slug: "philadelphia-flyers", fullName: "Philadelphia Flyers", abbrev: "PHI" },
  { slug: "pittsburgh-penguins", fullName: "Pittsburgh Penguins", abbrev: "PIT" },
  { slug: "san-jose-sharks", fullName: "San Jose Sharks", abbrev: "SJS" },
  { slug: "seattle-kraken", fullName: "Seattle Kraken", abbrev: "SEA" },
  { slug: "st-louis-blues", fullName: "St. Louis Blues", abbrev: "STL" },
  { slug: "tampa-bay-lightning", fullName: "Tampa Bay Lightning", abbrev: "TBL" },
  { slug: "toronto-maple-leafs", fullName: "Toronto Maple Leafs", abbrev: "TOR" },
  { slug: "utah-mammoth", fullName: "Utah Mammoth", abbrev: "UTA" },
  { slug: "vancouver-canucks", fullName: "Vancouver Canucks", abbrev: "VAN" },
  { slug: "vegas-golden-knights", fullName: "Vegas Golden Knights", abbrev: "VGK" },
  { slug: "washington-capitals", fullName: "Washington Capitals", abbrev: "WSH" },
  { slug: "winnipeg-jets", fullName: "Winnipeg Jets", abbrev: "WPG" },
];

export function findNhlTeam(slug: string): NhlTeam | undefined {
  return NHL_TEAMS.find((t) => t.slug === slug);
}
