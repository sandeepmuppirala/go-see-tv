/**
 * Signed, no-login-required unsubscribe token (ADR-027, the UX review's
 * requirement: "every email includes a one-click, no-login-required
 * unsubscribe link"). HMAC-SHA256 over the favorite id with a server-
 * only secret -- deliberately not a JWT library or a new dependency for
 * what's a single signed value with no claims beyond "this favorite
 * id, signed by us" (AGENTS.md §4: no library speculatively).
 */
import { createHmac, timingSafeEqual } from "node:crypto";

function secret(): string | null {
  return process.env.UNSUBSCRIBE_SECRET ?? null;
}

export function signFavoriteId(favoriteId: string): string | null {
  const key = secret();
  if (!key) return null;
  const sig = createHmac("sha256", key).update(favoriteId).digest("hex");
  return `${favoriteId}.${sig}`;
}

export function verifyToken(token: string): string | null {
  const key = secret();
  if (!key) return null;
  const [favoriteId, sig] = token.split(".");
  if (!favoriteId || !sig) return null;
  const expected = createHmac("sha256", key).update(favoriteId).digest("hex");
  const sigBuf = Buffer.from(sig, "hex");
  const expectedBuf = Buffer.from(expected, "hex");
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!timingSafeEqual(sigBuf, expectedBuf)) return null;
  return favoriteId;
}
