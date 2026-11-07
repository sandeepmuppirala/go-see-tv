import type { Metadata } from "next";
import Link from "next/link";
import { NHL_TEAMS } from "@/lib/nhl-teams";

export const metadata: Metadata = {
  title: "What channel is tonight's NHL game on? | VELA",
  description: "Pick your team for tonight's TV channel and streaming listing, for Canada and the US.",
  alternates: { canonical: "/nhl" },
};

export default function NhlTeamsIndexPage() {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "60px 24px", color: "#f6f6fa", lineHeight: 1.65 }}>
      <p style={{ color: "#a78bfa", fontSize: 13, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>VELA · NHL</p>
      <h1 style={{ fontSize: "clamp(26px,4.5vw,40px)", letterSpacing: -1, margin: "12px 0 24px" }}>What channel is tonight&apos;s NHL game on?</h1>
      <p>Pick a team for tonight&apos;s channel listing, sourced directly from the NHL schedule feed.</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 20 }}>
        {NHL_TEAMS.map((t) => (
          <Link
            key={t.slug}
            href={`/nhl/${t.slug}`}
            style={{ border: "1px solid #303044", background: "#151623", borderRadius: 9, padding: "9px 13px", fontSize: 13, fontWeight: 700, color: "#e2d9f6" }}
          >
            {t.fullName}
          </Link>
        ))}
      </div>
      <p style={{ marginTop: 32 }}>
        <Link href="/" style={{ color: "#a78bfa", fontWeight: 700 }}>
          See every game on tonight &rarr;
        </Link>
      </p>
    </main>
  );
}
