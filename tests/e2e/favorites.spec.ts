import { test, expect } from "@playwright/test";

/**
 * ADR-027. The signed-in flow is mocked at the network boundary (a
 * signed Supabase session cookie, plus mocked Supabase REST/auth
 * responses) rather than a real OAuth sign-in -- this app's login only
 * supports Google/GitHub OAuth, neither scriptable end-to-end without
 * a live account. This still exercises the real rendered app (real
 * React hydration, real click handling, real Supabase-js client code
 * in favorites.ts) against a real browser; it is not a claim that
 * Supabase's own authentication is being tested, only this app's code.
 */
const PROJECT_REF = "wcmenlkdadhsxvnrgvvg";
const fakeUser = {
  id: "22222222-2222-2222-2222-222222222222",
  aud: "authenticated",
  role: "authenticated",
  email: "vela-e2e-test@example.invalid",
  app_metadata: {},
  user_metadata: {},
  created_at: new Date().toISOString(),
};
const fakeSession = {
  access_token: "fake-access-token-for-e2e",
  refresh_token: "fake-refresh-token-for-e2e",
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  expires_in: 3600,
  token_type: "bearer",
  user: fakeUser,
};

// CI's playwright.yml workflow doesn't inject NEXT_PUBLIC_SUPABASE_URL/
// NEXT_PUBLIC_SUPABASE_ANON_KEY as repository secrets yet (pre-existing
// gap, not introduced by this feature) -- without them,
// lib/supabase/client.ts's createClient() throws inside the Next.js
// webServer process, so these two tests' cookie-mocked session is
// never actually read by a real client. Checked directly against
// NEXT_PUBLIC_SUPABASE_URL, not `process.env.CI` -- CI is always true
// in GitHub Actions regardless of whether the secrets exist, so that
// would permanently skip these even after someone adds them. Note for
// local runs: the Playwright test-runner process does NOT load
// .env.local the way Next.js's own dev-server process does (a
// Next.js-specific convention, not a general Node one) -- export it
// into your shell first to exercise these two locally, e.g.:
//   export NEXT_PUBLIC_SUPABASE_URL=$(grep -m1 NEXT_PUBLIC_SUPABASE_URL .env.local | cut -d= -f2-)
const SUPABASE_CONFIGURED = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

async function signIn(page: import("@playwright/test").Page) {
  await page.route("**/auth/v1/user*", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(fakeUser) })
  );
  const value = `base64-${Buffer.from(JSON.stringify(fakeSession)).toString("base64")}`;
  // playwright.config.ts's baseURL is 127.0.0.1, not localhost -- a
  // cookie domain mismatch here silently fails (Playwright drops a
  // cookie whose domain doesn't match the page it's attached to),
  // which is exactly what happened on the first attempt at this test.
  await page.context().addCookies([{ name: `sb-${PROJECT_REF}-auth-token`, value, domain: "127.0.0.1", path: "/" }]);
}

test("the follow toggle renders on a real team page with an honest volume disclosure", async ({ page }) => {
  await page.goto("/nhl/ottawa-senators");
  const toggle = page.getByRole("button", { name: /Email me on Ottawa Senators game days/i });
  await expect(toggle).toBeVisible();
  await expect(page.getByText(/one email on each game day, roughly 82 per NHL regular season/i)).toBeVisible();
});

test("clicking the follow toggle while signed out redirects to login, not a silent no-op", async ({ page }) => {
  await page.goto("/nhl/toronto-maple-leafs");
  const toggle = page.getByRole("button", { name: /Email me on Toronto Maple Leafs game days/i });
  await toggle.click();
  await page.waitForURL(/\/login\?next=/);
  expect(page.url()).toContain(encodeURIComponent("/nhl/toronto-maple-leafs"));
});

test("signed in, following a team shows the Following state and persists across a reload", async ({ page }) => {
  test.skip(!SUPABASE_CONFIGURED, "needs NEXT_PUBLIC_SUPABASE_URL set in this process's env -- see this file's comment on exporting it for local runs, or playwright.yml's job-level env for CI");
  let followed: { id: string; target_key: string; label: string; created_at: string }[] = [];
  await signIn(page);
  await page.route(`**/rest/v1/favorites*`, async (route) => {
    const method = route.request().method();
    if (method === "GET") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(followed) });
    if (method === "POST") {
      const created = { id: "fav-e2e-1", target_key: "ottawa-senators", label: "Ottawa Senators", created_at: new Date().toISOString() };
      followed = [created];
      return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify([created]) });
    }
    return route.continue();
  });

  await page.goto("/nhl/ottawa-senators");
  await page.getByRole("button", { name: /Email me on Ottawa Senators game days/i }).click();
  await expect(page.getByRole("button", { name: "Following Ottawa Senators" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("button", { name: "Following Ottawa Senators" })).toBeVisible();
});

test("signed in, unfollowing a team returns to the default state", async ({ page }) => {
  test.skip(!SUPABASE_CONFIGURED, "needs NEXT_PUBLIC_SUPABASE_URL set in this process's env -- see this file's comment on exporting it for local runs, or playwright.yml's job-level env for CI");
  let followed = [{ id: "fav-e2e-2", target_key: "edmonton-oilers", label: "Edmonton Oilers", created_at: new Date().toISOString() }];
  await signIn(page);
  await page.route(`**/rest/v1/favorites*`, async (route) => {
    const method = route.request().method();
    if (method === "GET") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(followed) });
    if (method === "DELETE") {
      followed = [];
      return route.fulfill({ status: 204, body: "" });
    }
    return route.continue();
  });

  await page.goto("/nhl/edmonton-oilers");
  const followingButton = page.getByRole("button", { name: "Following Edmonton Oilers" });
  await expect(followingButton).toBeVisible();
  await followingButton.click();
  await expect(page.getByRole("button", { name: /Email me on Edmonton Oilers game days/i })).toBeVisible();
});

test("the unsubscribe route rejects a missing token rather than erroring opaquely", async ({ request }) => {
  const response = await request.get("/unsubscribe");
  expect(response.status()).toBe(400);
  expect(await response.text()).toContain("Missing unsubscribe link token");
});

test("the unsubscribe route rejects a garbage token as invalid, not a crash", async ({ request }) => {
  const response = await request.get("/unsubscribe?token=not-a-real-token");
  expect([400, 503]).toContain(response.status());
});

test("the cron route refuses an unauthenticated request", async ({ request }) => {
  const response = await request.get("/api/cron/favorites-notify");
  expect([401, 503]).toContain(response.status());
});

test("the cron route refuses a request with the wrong secret", async ({ request }) => {
  const response = await request.get("/api/cron/favorites-notify", { headers: { Authorization: "Bearer wrong-secret" } });
  expect([401, 503]).toContain(response.status());
});
