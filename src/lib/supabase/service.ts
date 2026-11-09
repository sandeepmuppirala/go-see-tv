/**
 * Service-role Supabase client (BYPASSRLS) — for the favorites-
 * notification cron route ONLY. Never imported from a user-facing page
 * or a route a browser can call directly; see
 * app/api/cron/favorites-notify/route.ts's own secret-header check for
 * the second, independent layer protecting the only place this is used.
 *
 * ADR-027 (go-see-events' docs/architecture-decisions.md): VELA has no
 * backend of its own, so a cross-user sweep (every user's followed
 * teams, not just one signed-in session's own rows) has no
 * `app_service`-equivalent role to reach for the way ORBI's FastAPI
 * backend does — this service-role key is that equivalent for VELA's
 * one genuinely cross-user read path.
 */
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;
  return createSupabaseClient(url, serviceRoleKey, { auth: { persistSession: false } });
}
