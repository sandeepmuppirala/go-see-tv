/**
 * Client-side favorites CRUD against the shared `favorites` table
 * (go-see-events' alembic migration `c3a8f12d6e94`, ADR-027). VELA's V1
 * scope is exactly the 32 existing NHL_TEAMS (nhl-teams.ts) — no
 * artist/keyword concept exists here, unlike ORBI's broader catalog.
 *
 * RLS (`user_id = auth.uid()`) already scopes every query to the
 * caller's own rows -- the explicit `.eq("user_id", ...)` filters below
 * are the redundant, intentional second layer this project's own
 * standing rule requires (AGENTS.md §5, and the exact precedent this
 * app's own auth-status.tsx already set for product_subscriptions).
 */
import { createClient } from "@/lib/supabase/client";
import { findNhlTeam } from "@/lib/nhl-teams";

export type Favorite = {
  id: string;
  target_key: string;
  label: string;
  created_at: string;
};

export async function listFavorites(userId: string): Promise<Favorite[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("favorites")
    .select("id, target_key, label, created_at")
    .eq("user_id", userId)
    .eq("product", "vela")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function followTeam(userId: string, teamSlug: string): Promise<Favorite> {
  const team = findNhlTeam(teamSlug);
  if (!team) throw new Error(`${teamSlug} is not a followable team.`);

  const supabase = createClient();
  // ON CONFLICT DO NOTHING, then re-select -- the exact same pattern
  // ORBI's POST /v1/favorites route uses and the exact same reason:
  // Postgres RLS evaluates a DO UPDATE arm against the table's UPDATE
  // policy even when reached via INSERT's conflict path, and this
  // table has no UPDATE policy for `authenticated` at all (a label
  // never needs updating -- it's a fixed display string).
  const { data: inserted, error: insertError } = await supabase
    .from("favorites")
    .insert({ user_id: userId, product: "vela", favorite_type: "nhl_team", target_key: team.slug, label: team.fullName })
    .select("id, target_key, label, created_at")
    .maybeSingle();

  if (!insertError && inserted) return inserted;

  const { data: existing, error: selectError } = await supabase
    .from("favorites")
    .select("id, target_key, label, created_at")
    .eq("user_id", userId)
    .eq("product", "vela")
    .eq("favorite_type", "nhl_team")
    .eq("target_key", team.slug)
    .single();
  if (selectError || !existing) throw insertError ?? selectError ?? new Error("Could not follow this team.");
  return existing;
}

export async function unfollowFavorite(userId: string, favoriteId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("favorites").delete().eq("id", favoriteId).eq("user_id", userId);
  if (error) throw error;
}
