"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { followTeam, listFavorites, unfollowFavorite, type Favorite } from "@/lib/favorites";

/**
 * ADR-027. Placed next to this page's own trust line deliberately — the
 * opt-in should sit next to the exact sourcing claim it depends on, so
 * the email's honesty guarantee visibly matches the page's (UX review
 * finding). The volume line below is shown inline at the moment of
 * following, not buried in a settings page found later — the UX
 * review's fix for the real spam-risk this flagged: a visitor cannot
 * currently know "how often" from anywhere else before opting in.
 */
export function FollowTeamToggle({ slug, label }: { slug: string; label: string }) {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null | undefined>(undefined); // undefined = still resolving
  const [favorite, setFavorite] = useState<Favorite | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch {
      // Same degrade-safely pattern ORBI's own useAuth hook establishes:
      // a missing Supabase config must degrade this one widget to
      // signed-out, never crash or hang the whole page (confirmed real
      // in CI, which doesn't inject these env vars yet -- see
      // tests/e2e/favorites.spec.ts).
      setUserId(null);
      return;
    }
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!active) return;
      setUserId(data.user?.id ?? null);
      if (!data.user) return;
      try {
        const existing = await listFavorites(data.user.id);
        if (active) setFavorite(existing.find((f) => f.target_key === slug) ?? null);
      } catch {
        // A failed read here degrades to "not following" rather than
        // blocking the page — this is a secondary feature on a page
        // that otherwise works fully without it.
      }
    })();
    return () => {
      active = false;
    };
  }, [slug]);

  async function handleToggle() {
    if (userId === undefined) return;
    if (userId === null) {
      router.push(`/login?next=${encodeURIComponent(`/nhl/${slug}`)}`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (favorite) {
        await unfollowFavorite(userId, favorite.id);
        setFavorite(null);
      } else {
        const created = await followTeam(userId, slug);
        setFavorite(created);
      }
    } catch {
      setError(favorite ? "Could not unfollow this team. Please try again." : "Could not follow this team. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ marginTop: 16 }}>
      <button
        type="button"
        onClick={handleToggle}
        disabled={saving || userId === undefined}
        aria-pressed={!!favorite}
        style={{
          border: "1px solid #a78bfa",
          background: favorite ? "#302451" : "transparent",
          color: "#e1d8ff",
          borderRadius: 999,
          padding: "9px 16px",
          fontSize: 13,
          fontWeight: 700,
          cursor: saving ? "default" : "pointer",
          opacity: saving ? 0.6 : 1,
        }}
      >
        {saving ? "Saving…" : favorite ? `Following ${label}` : `Email me on ${label} game days`}
      </button>
      {!favorite ? (
        <p style={{ fontSize: 12, color: "#a5a5ba", marginTop: 6 }}>
          You&apos;ll get one email on each game day, roughly 82 per NHL regular season. Stop any time from the email&apos;s own unsubscribe link.
        </p>
      ) : null}
      {error ? (
        <p role="alert" style={{ fontSize: 12, color: "#ff9b9b", marginTop: 6 }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
