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
 * to decide by unilaterally paywalling what currently works. See the
 * beau repo's docs/decision-log.md's "BEAU billing entry".
 */
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { hasAccess, type ProductSubscription } from "@/lib/entitlements";

const BEAU_URL = process.env.NEXT_PUBLIC_BEAU_URL ?? "https://beau-self.vercel.app";

export function AuthStatus() {
  const [state, setState] = useState<"loading" | "signed-out" | "subscribed" | "not-subscribed">("loading");

  useEffect(() => {
    async function loadAuthStatus() {
      // client.ts fails loudly (by design, see that file) if Supabase isn't
      // configured — which is correct for a real misconfiguration, but this
      // widget is a secondary feature bolted onto an otherwise fully free,
      // fully working guide page. A missing env var here must degrade this
      // one widget, never crash the whole page the way an uncaught throw in
      // an effect does (React unmounts the nearest boundary's subtree).
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setState("signed-out");
          return;
        }
        // RLS alone already scopes this to the caller's own row (the
        // table's one policy is `user_id = auth.uid()`), but a security
        // review flagged that relying on RLS as the SOLE boundary here is
        // a literal departure from this project's own standing rule that
        // RLS must be a second layer, not a substitute for application-
        // layer filtering. Adding the explicit `user_id` filter costs
        // nothing and brings this into compliance with that rule directly
        // — simpler and safer than arguing for an exception to it.
        const { data } = await supabase
          .from("product_subscriptions")
          .select("product, status, current_period_end")
          .eq("product", "vela")
          .eq("user_id", user.id)
          .maybeSingle<ProductSubscription>();
        setState(hasAccess(data ?? undefined) ? "subscribed" : "not-subscribed");
      } catch {
        setState("signed-out");
      }
    }
    void loadAuthStatus();
  }, []);

  if (state === "loading") return <span className="soon">·</span>;
  if (state === "signed-out") return <a className="soon" href={`${BEAU_URL}/login?next=vela`}>Sign in</a>;
  if (state === "subscribed") return <span className="soon" style={{ color: "#78c89a" }}>Subscribed</span>;
  return <a className="soon" href={`${BEAU_URL}/portal`}>Subscribe for more</a>;
}
