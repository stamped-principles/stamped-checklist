import { test, expect } from "@chromatic-com/playwright";

test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.clear());
    await page.goto("/");
});

test("Main page - default (light mode)", async ({ page }) => {
    await page.waitForSelector(".principle-card");
});

test("Main page - dark mode", async ({ page }) => {
    await page.waitForSelector(".principle-card");
    await page.click("#theme-toggle");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});
