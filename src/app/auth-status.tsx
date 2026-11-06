"use client";

/**
 * Replaces the header's long-dead "Sign in · Coming soon" text with a real
 * link to BEAU (the shared sign-in for ORBI and VELA) and, once signed
 * in, the user's VELA subscription status.
 *
 * Deliberately does NOT gate any of this page's existing guide content —
 * the guide stays exactly as free/functional as it already was. Which
 * specific VELA features (if any) should sit behind the subscription is
 * a product decision for the founder to make explicitly, not something
 * to decide by unilaterally paywalling what currently works. See
 * docs/decision-log.md's BEAU billing entry.
 */
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { hasAccess, type ProductSubscription } from "@/lib/entitlements";

const BEAU_URL = process.env.NEXT_PUBLIC_BEAU_URL ?? "https://beau-self.vercel.app";

export function AuthStatus() {
  const [state, setState] = useState<"loading" | "signed-out" | "subscribed" | "not-subscribed">("loading");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        setState("signed-out");
        return;
      }
      const { data } = await supabase
        .from("product_subscriptions")
        .select("product, status, current_period_end")
        .eq("product", "vela")
        .maybeSingle<ProductSubscription>();
      setState(hasAccess(data ?? undefined) ? "subscribed" : "not-subscribed");
    });
  }, []);

  if (state === "loading") return <span className="soon">·</span>;
  if (state === "signed-out") return <a className="soon" href={`${BEAU_URL}/login`}>Sign in</a>;
  if (state === "subscribed") return <span className="soon" style={{ color: "#78c89a" }}>Subscribed</span>;
  return <a className="soon" href={`${BEAU_URL}/portal`}>Subscribe for more</a>;
}
