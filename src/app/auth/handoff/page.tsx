"use client";

/**
 * Receives a session handed off from BEAU. Identical in structure and
 * rationale to go-see-events (ORBI)'s own src/app/auth/handoff/page.tsx —
 * see that file's comment for the full explanation of why this uses a URL
 * fragment token handoff rather than a shared cookie (no shared custom
 * domain exists yet across beau-self.vercel.app / this app / ORBI).
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function HandoffPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);
    const refreshToken = params.get("rt");
    if (!refreshToken) {
      setError("No session to receive — missing token.");
      return;
    }
    window.history.replaceState(null, "", window.location.pathname);

    const supabase = createClient();
    supabase.auth
      .refreshSession({ refresh_token: refreshToken })
      .then(({ error }) => {
        if (error) {
          setError("Could not establish your session here. Please sign in again.");
          return;
        }
        router.replace("/");
      });
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
