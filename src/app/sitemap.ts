import type { MetadataRoute } from "next";
import { NHL_TEAMS } from "@/lib/nhl-teams";

// Matches the existing `NEXT_PUBLIC_BEAU_URL ?? "https://..."` pattern
// this app already uses for its own production domain (auth-status.tsx)
// rather than inventing a second convention.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://go-see-tv.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPaths = ["", "/nhl-streaming-cost", "/privacy"];
  const staticEntries: MetadataRoute.Sitemap = staticPaths.map((path) => ({ url: `${SITE_URL}${path}` }));
  // Revalidates every 15 minutes (route.ts's own `revalidate`), so no
  // fabricated `lastModified` -- there's no real "last changed" date
  // tracked for a page whose content is tonight's live schedule.
  const teamEntries: MetadataRoute.Sitemap = NHL_TEAMS.map((t) => ({ url: `${SITE_URL}/nhl/${t.slug}` }));
  return [...staticEntries, ...teamEntries];
}
