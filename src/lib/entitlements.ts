/** Matches BEAU's own lib/entitlements.ts exactly — same table
 * (product_subscriptions, go-see-events alembic migration
 * a1c7f4e9b3d2), same status vocabulary (mirrors Stripe's directly). */
export type ProductId = "orbi" | "vela";

// Everything between the markers below is kept byte-identical to
// beau's own src/lib/entitlements.ts (beau imports ProductId from its
// own products.ts instead of defining it locally -- this repo has no
// products.ts, that's the one legitimate difference, kept outside the
// marked region). scripts/check-drift.mjs enforces this by fetching
// beau's current file from GitHub and diffing this exact region. This
// intro comment is deliberately OUTSIDE the markers -- it names the
// sibling file, so it can never be byte-identical to the sibling's own
// copy of this same comment.
// ---BEGIN SHARED ENTITLEMENTS LOGIC---
export type SubscriptionStatus =
  | "active" | "trialing" | "past_due" | "canceled" | "incomplete" | "incomplete_expired" | "unpaid" | "paused";

export type ProductSubscription = {
  product: ProductId;
  status: SubscriptionStatus;
  current_period_end: string | null;
};

/** "Active" per the backend (go-see-events alembic migration
 * a1c7f4e9b3d2_product_subscriptions.py)'s own status vocabulary, mirrored
 * directly from Stripe. `trialing` counts as access; everything else
 * (past_due, canceled, incomplete*, unpaid, paused) does not — a lapsed
 * payment should not silently keep access, even briefly. */
export function hasAccess(sub: ProductSubscription | undefined): boolean {
  return sub?.status === "active" || sub?.status === "trialing";
}
// ---END SHARED ENTITLEMENTS LOGIC---
