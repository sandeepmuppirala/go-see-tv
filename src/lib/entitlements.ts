/** Matches BEAU's own lib/entitlements.ts exactly — same table
 * (product_subscriptions, go-see-events alembic migration
 * a1c7f4e9b3d2), same status vocabulary (mirrors Stripe's directly). */
export type ProductId = "orbi" | "vela";

export type SubscriptionStatus =
  | "active" | "trialing" | "past_due" | "canceled" | "incomplete" | "incomplete_expired" | "unpaid" | "paused";

export type ProductSubscription = {
  product: ProductId;
  status: SubscriptionStatus;
  current_period_end: string | null;
};

export function hasAccess(sub: ProductSubscription | undefined): boolean {
  return sub?.status === "active" || sub?.status === "trialing";
}
