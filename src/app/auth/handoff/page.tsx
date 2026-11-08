"use client";

/**
 * Receives a session handed off from BEAU. Identical in structure and
 * rationale to go-see-events (ORBI)'s own src/app/auth/handoff/page.tsx —
 * see that file's comment for the full explanation of why this uses a URL
 * fragment token handoff rather than a shared cookie (no shared custom
 * domain exists yet across beau-self.vercel.app / this app / ORBI), the
 * beau repo's docs/decision-log.md's "BEAU auth entry" for the known
 * residual risk in this exact handoff, and go-see-events'
 * docs/architecture-decisions.md ADR-026 for the full rationale.
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// ---BEGIN SHARED HANDOFF LOGIC---
// Kept byte-identical to the same block in go-see-events (ORBI)'s own
// src/app/auth/handoff/page.tsx — a drift-detection test in each repo
// (tests/drift/handoff-page.test.ts) enforces this by fetching the
// other repo's current file from GitHub and diffing this exact region.
// Found already drifted once (async/await vs .then()) before this
// check existed, at just two products — see ADR-026's architecture
// review amendment for why this exists at all.
export default function HandoffPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function receiveSession() {
      const hash = window.location.hash.slice(1);
      const params = new URLSearchParams(hash);
      const refreshToken = params.get("rt");
      if (!refreshToken) {
        setError("No session to receive — missing token.");
        return;
      }
      // Strip the token from the URL/history immediately, before the
      // network round trip, not after — the fragment has already served
      // its purpose once read here.
      window.history.replaceState(null, "", window.location.pathname);

      const supabase = createClient();
      const { error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
      if (error) {
        setError("Could not establish your session here. Please sign in again.");
        return;
      }
      router.replace("/");
    }
    void receiveSession();
  }, [router]);

  return (
    <main style={{ padding: 60, textAlign: "center" }}>
      {error ? (
        <>
          <p>{error}</p>
          <a href="/">Go to the homepage</a>
        </>
      ) : (
        <p>Signing you in…</p>
      )}
    </main>
  );
}
// ---END SHARED HANDOFF LOGIC---
