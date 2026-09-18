import { test, expect } from "@playwright/test";

test("runner boots and serves a page", async ({ page }) => {
  const healthResponse = await page.goto("/health-check");
  expect(healthResponse?.status()).toBe(200);

  const pageResponse = await page.goto("/");
  expect(pageResponse?.status()).toBe(200);
});
