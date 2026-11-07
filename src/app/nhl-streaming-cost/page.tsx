import Link from "next/link";

export const metadata = {
  title: "What it actually costs to watch every NHL game in Canada this season | VELA",
  description:
    "A plain breakdown of what Canadian hockey fans now pay across Sportsnet+, Prime Video, and regional broadcasters to follow the NHL in 2026-27.",
};

export default function NhlStreamingCostPage() {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "60px 24px", color: "#f6f6fa", lineHeight: 1.65 }}>
      <p style={{ color: "#a78bfa", fontSize: 13, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>
        VELA · Cord-cutter cost breakdown
      </p>
      <h1 style={{ fontSize: "clamp(28px,5vw,44px)", letterSpacing: -1, margin: "12px 0 24px" }}>
        What it actually costs to watch every NHL game in Canada this season
      </h1>

      <p>
        For the first time since Hockey Night in Canada&apos;s television debut in 1952, NHL games are not available
        to Canadian viewers through the public broadcaster. Rights are now split across Rogers&apos; Sportsnet+ and a
        new 12-year sublicensing deal that gives Amazon Prime Video exclusive national rights to Wednesday Night
        Hockey. Sportsnet still carries the bulk of national and regional games, but following a single team
        through a full season now means piecing together more than one subscription.
      </p>

      <h2 style={{ fontSize: 22, marginTop: 36 }}>The real prices, as of this season</h2>
      <ul style={{ paddingLeft: 20 }}>
        <li>
          <strong>Sportsnet+ Standard</strong>: $34.99/month or $269.99/year — up again this season, the third price
          increase in roughly two years.
        </li>
        <li>
          <strong>Sportsnet+ Premium</strong>: $44.99/month or $344.99/year.
        </li>
        <li>
          <strong>Amazon Prime Video</strong>: $9.99/month or $99/year — required for Wednesday Night Hockey, which
          is otherwise included for existing Prime members at no extra charge.
        </li>
      </ul>

      <h2 style={{ fontSize: 22, marginTop: 36 }}>What one team&apos;s full season actually costs</h2>
      <p>
        The Ottawa Citizen calculated the minimum cost to watch every Ottawa Senators game this season — strategically
        adding and cancelling plans around the schedule rather than paying for a full year of everything — at{" "}
        <strong>$519.61</strong>. A less optimized approach, just running every service for the full season, lands
        closer to <strong>$620</strong> once every regional and streaming piece is added up.
      </p>
      <p>
        The exact number differs by team (regional broadcast rights vary), but the shape of the problem doesn&apos;t:
        no single subscription covers a full NHL season in Canada anymore.
      </p>

      <h2 style={{ fontSize: 22, marginTop: 36 }}>Why this happened</h2>
      <p>
        Rogers and Amazon signed a 12-year sublicensing agreement in 2026 giving Prime Video exclusive rights to at
        least 26 national regular-season games a year plus playoff coverage, while Sportsnet retained the larger
        share of national and regional games. Sportsnet+ raised its own prices shortly after, ahead of the new
        season starting.
      </p>

      <div
        style={{
          marginTop: 40,
          padding: "20px 24px",
          background: "#171725",
          border: "1px solid #353145",
          borderRadius: 16,
        }}
      >
        <p style={{ margin: 0, fontWeight: 700 }}>This is exactly the mess VELA exists to untangle.</p>
        <p style={{ margin: "8px 0 16px", color: "#b0b0c0" }}>
          Before you add another subscription, check which service actually has tonight&apos;s game — for free, no
          sign-in required.
        </p>
        <Link
          href="/"
          style={{
            display: "inline-block",
            padding: "10px 18px",
            background: "#7759e9",
            color: "#fff",
            borderRadius: 9,
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Check tonight&apos;s games
        </Link>
      </div>

      <h2 style={{ fontSize: 18, marginTop: 40, color: "#b0b0c0" }}>Sources</h2>
      <ul style={{ paddingLeft: 20, fontSize: 14, color: "#8e90a8" }}>
        <li>
          <a href="https://mobilesyrup.com/2026/11/02/telus-blames-rogers-missing-nhl-games/" target="_blank" rel="noopener noreferrer" style={{ color: "#a78bfa" }}>
            MobileSyrup, Nov 2, 2026 — Telus blames Rogers for missing NHL games
          </a>{" "}
          (cites the Ottawa Citizen&apos;s $519.61 Senators calculation)
        </li>
        <li>
          <a href="https://www.iphoneincanada.ca/2026/09/22/sportsnet-plus-price-increase-canada-nhl-2026/" target="_blank" rel="noopener noreferrer" style={{ color: "#a78bfa" }}>
            iPhone in Canada — Sportsnet+ price increase ahead of the 2026-27 NHL season
          </a>
        </li>
        <li>
          <a href="https://www.iphoneincanada.ca/2026/07/28/rogers-passes-exclusive-wednesday-night-nhl-games-to-prime-video/" target="_blank" rel="noopener noreferrer" style={{ color: "#a78bfa" }}>
            iPhone in Canada — Rogers passes exclusive Wednesday Night NHL games to Prime Video
          </a>
        </li>
        <li>
          <a href="https://money.ca/news/sportsnet-nhl-streaming-costs-canada" target="_blank" rel="noopener noreferrer" style={{ color: "#a78bfa" }}>
            Money.ca — Sportsnet NHL streaming costs in Canada
          </a>
        </li>
      </ul>
      <p style={{ fontSize: 13, color: "#77798e", marginTop: 24 }}>
        Prices and rights are current as of November 2026 and change often — verify directly with each service
        before subscribing.
      </p>
    </main>
  );
}
