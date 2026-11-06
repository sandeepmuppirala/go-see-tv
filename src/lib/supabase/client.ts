/**
 * Browser-side Supabase client. Matches go-see-events (ORBI)'s own
 * frontend/src/lib/supabase/client.ts exactly — same Supabase project,
 * same fail-loudly-on-missing-config discipline, kept consistent since
 * BEAU/ORBI/VELA all share one project for identity.
 */
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are not configured — see .env.example");
  }
  return createBrowserClient(url, anonKey);
}
