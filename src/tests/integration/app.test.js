import { test, expect } from "@playwright/test";
import { DATA } from "../../checklist.js";
import { GA_MEASUREMENT_ID } from "../../analytics.js";

const TOTAL_PRINCIPLES = DATA.flatMap((s) => s.principles).length;

async function answerYes(page, yesButtonLocator) {
    await yesButtonLocator.click();
}

// Toolbar radio buttons also use display:none.
// Click the visible col-toggle-option label that wraps each hidden radio input.
async function clickToolbarOption(page, name, value) {
    await page.locator(`.col-toggle-option:has(input[name="${name}"][value="${value}"])`).click();
}

test.describe("STAMPED Checklist App", () => {
    test.beforeEach(async ({ page }) => {
        // Clear localStorage before each test to ensure a clean slate.
        // addInitScript runs before every navigation in the page context.
        await page.addInitScript(() => localStorage.clear());
        await page.goto("/");
    });

    test("page loads and displays the header", async ({ page }) => {
        await expect(page.locator("h1")).toContainText("STAMPED Compliance Checklist");
    });

    test("header includes GitHub nav icon link to this repository", async ({ page }) => {
        const githubLink = page.locator(".header-actions .github-link");
        await expect(githubLink).toBeVisible();
        await expect(githubLink).toHaveAttribute("href", "https://github.com/stamped-principles/stamped-checklist");
    });

    test("theme defaults to browser preference and can be toggled", async ({ page }) => {
        const prefersDark = await page.evaluate(
            () => window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
        );
        const expectedTheme = prefersDark ? "dark" : "light";
        const html = page.locator("html");

        await expect(html).toHaveAttribute("data-theme", expectedTheme);

        await page.locator("#theme-toggle").click();

        await expect(html).toHaveAttribute("data-theme", expectedTheme === "dark" ? "light" : "dark");
    });

    test("cookie consent banner is shown before acceptance", async ({ page }) => {
        await expect(page.locator("#cookie-consent-banner")).toBeVisible();
    });

    test("accepting cookie consent hides banner and persists across reload", async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        await page.goto("/");

        await page.locator("#cookie-consent-accept").click();
        await expect(page.locator("#cookie-consent-banner")).toBeHidden();
        await expect(page.locator(`script[src*="googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"]`)).toHaveCount(
            1
        );
        await expect
            .poll(async () => page.evaluate(() => localStorage.getItem("stamped_cookie_consent")))
            .toBe("accepted");

        await page.reload();
        await expect(page.locator("#cookie-consent-banner")).toBeHidden();

        await context.close();
    });

    test("declining cookie consent hides banner and prevents analytics initialization", async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        await page.goto("/");

        await page.locator("#cookie-consent-decline").click();
        await expect(page.locator("#cookie-consent-banner")).toBeHidden();
        await expect(page.locator(`script[src*="googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"]`)).toHaveCount(
            0
        );
        await expect
            .poll(async () => page.evaluate(() => localStorage.getItem("stamped_cookie_consent")))
            .toBe("declined");

        await page.reload();
        await expect(page.locator("#cookie-consent-banner")).toBeHidden();

        await context.close();
    });

    test("checklist cards are rendered", async ({ page }) => {
        await expect(page.locator(".principle-card")).toHaveCount(TOTAL_PRINCIPLES);
    });

    test("each principle card includes an examples icon link", async ({ page }) => {
        const links = page.locator(".principle-examples-link");
        await expect(links).toHaveCount(TOTAL_PRINCIPLES);
        await expect(links.first()).toHaveText("💡");
        await expect(links.first()).toHaveAttribute(
            "href",
            "https://stamped-principles.github.io/stamped-examples/stamped_principles/s/"
        );
        await expect(links.first()).not.toHaveAttribute("href", /404/i);
    });

    test("inline markdown code text renders as code elements", async ({ page }) => {
        const codeSpans = page.locator(".response-row .check-text code");
        expect(await codeSpans.count()).toBeGreaterThan(0);
        await expect(codeSpans.filter({ hasText: "git" }).first()).toBeVisible();
    });

    test("initial progress shows 0 items checked", async ({ page }) => {
        const progressText = page.locator("#progressText");
        await expect(progressText).toContainText("0 /");
        await expect(progressText).toContainText("(0%)");
    });

    test("answering yes updates the principle counter", async ({ page }) => {
        const firstCounter = page.locator("#count_0_0");
        await expect(firstCounter).toContainText("0/");

        await answerYes(page, page.locator(".yes-btn").first());

        await expect(firstCounter).toContainText("1/");
    });

    test("checking all items in a principle marks it complete", async ({ page }) => {
        const firstCard = page.locator("#card_0_0");
        await expect(firstCard).not.toHaveClass(/complete/);

        const yesButtons = firstCard.locator(".yes-btn");
        const count = await yesButtons.count();
        for (let i = 0; i < count; i++) {
            await answerYes(page, yesButtons.nth(i));
        }

        await expect(firstCard).toHaveClass(/complete/);
    });

    test("progress bar percentage updates after checking items", async ({ page }) => {
        await answerYes(page, page.locator(".yes-btn").first());
        await expect(page.locator("#progressText")).not.toContainText("(0%)");
    });

    test("toolbar does not render a Share URL button", async ({ page }) => {
        await expect(page.locator("button", { hasText: "Share URL" })).toHaveCount(0);
    });

    test("columns toggle changes grid layout", async ({ page }) => {
        const grid = page.locator(".cards-grid").first();

        await clickToolbarOption(page, "cols", "1");
        await expect(grid).toHaveClass(/cols-1/);

        await clickToolbarOption(page, "cols", "2");
        await expect(grid).toHaveClass(/cols-2/);

        await clickToolbarOption(page, "cols", "auto");
        await expect(grid).toHaveClass(/cols-auto/);
    });

    test("sections toggle adds/removes flat-mode class", async ({ page }) => {
        const app = page.locator("#app");

        await clickToolbarOption(page, "sections", "on");
        await expect(app).not.toHaveClass(/flat-mode/);

        await clickToolbarOption(page, "sections", "off");
        await expect(app).toHaveClass(/flat-mode/);
    });

    test("section dividers are visible when sections are turned on", async ({ page }) => {
        // Section dividers are hidden by default (flat-mode); turn sections on first
        await clickToolbarOption(page, "sections", "on");

        await expect(page.locator('.section-divider[data-level="must"]')).toBeVisible();
        await expect(page.locator('.section-divider[data-level="should"]')).toBeVisible();
        await expect(page.locator('.section-divider[data-level="may"]')).toBeVisible();
    });

    test("version indicator is populated", async ({ page }) => {
        await expect(page.locator("#version-indicator")).toHaveText(/^v\d/);
    });

    test("reset button resets responses", async ({ page }) => {
        const firstYes = page.locator(".yes-btn").first();

        await answerYes(page, firstYes);
        await expect(firstYes).toHaveClass(/active/);
        await expect(page.locator("#count_0_0")).toContainText("1/");

        // Accept the reset confirmation dialog
        page.on("dialog", (dialog) => dialog.accept());
        await page.locator("button.danger").click();

        await expect(firstYes).not.toHaveClass(/active/);
        await expect(page.locator("#count_0_0")).toContainText("0/");
    });

    test("yes/no buttons are shown", async ({ page }) => {
        await expect(page.locator(".yes-btn").first()).toBeVisible();
        await expect(page.locator(".no-btn").first()).toBeVisible();
    });

    test("no button reveals reason textarea", async ({ page }) => {
        await page.locator(".no-btn").first().click();
        await expect(page.locator(".reason-input").first()).toHaveClass(/visible/);
    });

    // Use a fresh browser context (not affected by addInitScript) to verify
    // that autoSave persists state across page loads.
    test("state persists in localStorage after answering yes", async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();

        await page.goto("/");

        const yesId = await page.locator(".yes-btn").first().getAttribute("id");
        await page.locator(`#${yesId}`).click();

        await expect(page.locator(`#${yesId}`)).toHaveClass(/active/);

        // Open a new page in the same context — localStorage is shared within a context
        const page2 = await context.newPage();
        await page2.goto("/");

        await expect(page2.locator(`#${yesId}`)).toHaveClass(/active/);

        await context.close();
    });
});
