import { test, expect } from "@playwright/test";

const sample = {
  country: "BOTH",
  date: "2026-10-26",
  games: [
    {
      id: "mlb-1",
      name: "Brewers at Rays",
      sport: "Baseball",
      league: "MLB",
      startsAt: "2026-10-27T00:00:00Z",
      channels: ["FOX"],
      channelsByCountry: { CA: [], US: ["FOX"] },
      gender: "men",
      source: "ESPN",
      sourceUrl: "https://www.espn.com/",
    },
  ],
  partial: false,
};

test.beforeEach(async ({ page }) => {
  await page.route("**/api/broadcasts?**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(sample) })
  );
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("gender filter does not persist across reload, unlike country/sport/league", async ({ page }) => {
  // A visitor narrowing to Women's once (e.g. to check a specific
  // match) must not have every men's league silently hidden on their
  // next, unrelated visit with no indication why -- see page.tsx's own
  // comment on PREFS_KEY for the reasoning.
  await page.locator(".genderFilter button", { hasText: "Women's" }).click();
  await page.getByRole("button", { name: /United States/ }).click();
  await page.waitForTimeout(300);

  await page.reload();

  await expect(page.locator(".genderFilter button", { hasText: "All" })).toHaveClass(/active/);
  await expect(page.locator(".genderFilter button", { hasText: "Women's" })).not.toHaveClass(/active/);
  // Country is still a stable "who I am" preference and should persist.
  await expect(page.getByRole("button", { name: /United States/ })).toHaveClass(/selected/);
});
