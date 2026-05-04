import { test as base, expect } from "@playwright/test";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { DATA } from "../../src/checklist.js";
import { GA_MEASUREMENT_ID } from "../../src/analytics.js";

const TOTAL_PRINCIPLES = DATA.flatMap((s) => s.principles).length;
const COVERAGE_ENABLED = process.env.PW_COVERAGE === "1";
const COVERAGE_RAW_OUTPUT_DIR = resolve(process.cwd(), "coverage", "integration", "raw");

const test = COVERAGE_ENABLED
    ? base.extend({
          page: async ({ page }, use, testInfo) => {
              if (typeof page.coverage?.startJSCoverage !== "function") {
                  await use(page);
                  return;
              }

              await page.coverage.startJSCoverage({ resetOnNavigation: false });
              try {
                  await use(page);
              } finally {
                  const coverage = await page.coverage.stopJSCoverage();
                  if (coverage.length === 0) return;

                  await mkdir(COVERAGE_RAW_OUTPUT_DIR, { recursive: true });
                  const fileHash = createHash("sha1").update(testInfo.testId).digest("hex");
                  const outputFile = resolve(COVERAGE_RAW_OUTPUT_DIR, `${fileHash}.json`);
                  await writeFile(outputFile, JSON.stringify(coverage));
              }
          },
      })
    : base;

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

    test("main page layout renders core controls and content", async ({ page }) => {
        await expect(page.locator("#theme-toggle")).toBeVisible();
        await expect(page.locator(".header-actions .github-link")).toBeVisible();
        await expect(page.locator(".toolbar").getByRole("button", { name: "Print" })).toBeVisible();
        await expect(page.locator(".toolbar").getByRole("button", { name: "Reset" })).toBeVisible();
        await expect(page.locator(".col-toggle-label").filter({ hasText: "Columns:" })).toBeVisible();
        await expect(page.locator(".col-toggle-label").filter({ hasText: "Sections:" })).toBeVisible();
        await expect(page.locator('#levelStats [data-level-stat="total"]')).toHaveCount(1);
        await expect(page.locator('#levelStats [data-level-stat="total"] .level-stat-counts .pass')).toHaveText("0✓");
        await expect(page.locator("#app .intro-text")).toContainText("This checklist helps you assess compliance");
        await expect(page.locator(".legend .legend-item")).toHaveCount(3);
    });

    test("toolbar sticks below header when scrolling", async ({ page }) => {
        // --header-height CSS variable must be set to the header's rendered height
        const headerHeight = await page.evaluate(() => {
            const header = document.querySelector(".header");
            return header ? header.offsetHeight : 0;
        });
        expect(headerHeight).toBeGreaterThan(0);

        const cssVar = await page.evaluate(() =>
            getComputedStyle(document.documentElement).getPropertyValue("--header-height").trim()
        );
        expect(cssVar).toBe(`${headerHeight}px`);

        // Toolbar must use that variable as its sticky top offset
        const toolbarTop = await page.evaluate(() => getComputedStyle(document.querySelector(".toolbar")).top);
        expect(toolbarTop).toBe(`${headerHeight}px`);

        // --toolbar-offset must equal header height + toolbar height
        const toolbarHeight = await page.evaluate(() => {
            const toolbar = document.querySelector(".toolbar");
            return toolbar ? toolbar.offsetHeight : 0;
        });
        const toolbarOffset = await page.evaluate(() =>
            getComputedStyle(document.documentElement).getPropertyValue("--toolbar-offset").trim()
        );
        expect(toolbarOffset).toBe(`${headerHeight + toolbarHeight}px`);

        // Intro text must use --toolbar-offset as its sticky top offset
        const introTop = await page.evaluate(() => getComputedStyle(document.querySelector(".intro-text")).top);
        expect(introTop).toBe(`${headerHeight + toolbarHeight}px`);
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

    test("initial progress shows all items as incomplete", async ({ page }) => {
        const totalRow = page.locator('#levelStats [data-level-stat="total"]');
        const passingSegment = totalRow.locator(".level-stat-bar .progress-segment.pass");
        const failingSegment = totalRow.locator(".level-stat-bar .progress-segment.fail");
        const incompleteSegment = totalRow.locator(".level-stat-bar .progress-segment.incomplete");
        await expect(passingSegment).toHaveCSS("width", "0px");
        await expect(failingSegment).toHaveCSS("width", "0px");
        await expect(incompleteSegment).not.toHaveCSS("width", "0px");
        await expect(totalRow.locator(".level-stat-counts .pass")).toHaveText("0✓");
        await expect(totalRow.locator(".level-stat-counts .fail")).toHaveText("0✗");
    });

    test("answering yes updates the principle counter", async ({ page }) => {
        const firstCounter = page.locator("#count_0_0");
        await expect(firstCounter).toContainText("0/");

        await answerYes(page, page.locator(".yes-btn").first());

        await expect(firstCounter).toContainText("1/");
    });

    test("checking all items in a principle marks it complete", async ({ page }) => {
        const firstCard = page.locator("#card_0_0");
        const firstCounter = page.locator("#count_0_0");
        await expect(firstCard).not.toHaveClass(/complete/);
        await expect(firstCounter).not.toHaveClass(/done/);

        const yesButtons = firstCard.locator(".yes-btn");
        const count = await yesButtons.count();
        for (let i = 0; i < count; i++) {
            await answerYes(page, yesButtons.nth(i));
        }

        await expect(firstCard).toHaveClass(/complete/);
        await expect(firstCounter).toHaveClass(/done/);
        await expect(firstCounter).not.toHaveClass(/failed/);
    });

    test("answering no marks the principle counter failed", async ({ page }) => {
        const firstCounter = page.locator("#count_0_0");
        await expect(firstCounter).not.toHaveClass(/done/);
        await expect(firstCounter).not.toHaveClass(/failed/);

        await page.locator(".no-btn").first().click();

        await expect(firstCounter).toHaveClass(/failed/);
        await expect(firstCounter).not.toHaveClass(/done/);
    });

    test("answering yes adds proportional passing fill", async ({ page }) => {
        await answerYes(page, page.locator(".yes-btn").first());
        const totalRow = page.locator('#levelStats [data-level-stat="total"]');
        await expect(totalRow.locator(".level-stat-bar .progress-segment.pass")).not.toHaveCSS("width", "0px");
        await expect(totalRow.locator(".level-stat-bar .progress-segment.fail")).toHaveCSS("width", "0px");
        await expect(totalRow.locator(".level-stat-counts .pass")).toHaveText("1✓");
    });

    test("answering no adds proportional failing fill after any passing fill", async ({ page }) => {
        await answerYes(page, page.locator(".yes-btn").first());
        await page.locator(".no-btn").nth(1).click();

        const totalRow = page.locator('#levelStats [data-level-stat="total"]');
        await expect(totalRow.locator(".level-stat-bar .progress-segment.pass")).not.toHaveCSS("width", "0px");
        await expect(totalRow.locator(".level-stat-bar .progress-segment.fail")).not.toHaveCSS("width", "0px");
        await expect(totalRow.locator(".level-stat-counts .pass")).toHaveText("1✓");
        await expect(totalRow.locator(".level-stat-counts .fail")).toHaveText("1✗");
    });

    test("answering yes on every item fills progress with passing only", async ({ page }) => {
        const yesButtons = page.locator(".yes-btn");
        const count = await yesButtons.count();

        for (let i = 0; i < count; i++) {
            await answerYes(page, yesButtons.nth(i));
        }

        const totalRow = page.locator('#levelStats [data-level-stat="total"]');
        await expect(totalRow.locator(".level-stat-bar .progress-segment.pass")).not.toHaveCSS("width", "0px");
        await expect(totalRow.locator(".level-stat-bar .progress-segment.fail")).toHaveCSS("width", "0px");
        await expect(totalRow.locator(".level-stat-bar .progress-segment.incomplete")).toHaveCSS("width", "0px");
        await expect(totalRow.locator(".level-stat-counts .fail")).toHaveText("0✗");
        await expect(totalRow.locator(".level-stat-counts .incomplete")).toHaveText("0?");
    });

    test("level stats container renders one row per requirement level plus total", async ({ page }) => {
        const rows = page.locator("#levelStats .level-stat-row");
        await expect(rows).toHaveCount(DATA.length + 1);
        await expect(page.locator('#levelStats .level-stat-row[data-level-stat="total"]')).toHaveCount(1);
        for (const section of DATA) {
            await expect(page.locator(`#levelStats .level-stat-row[data-level-stat="${section.level}"]`)).toHaveCount(
                1
            );
        }
    });

    test("level stats show 0% passing on initial load", async ({ page }) => {
        const rows = page.locator("#levelStats .level-stat-row");
        const count = await rows.count();
        for (let i = 0; i < count; i++) {
            await expect(rows.nth(i).locator(".level-stat-pct")).toHaveText("0%");
        }
    });

    test("level stats update passing count when yes is answered", async ({ page }) => {
        await answerYes(page, page.locator(".yes-btn").first());
        const firstLevelRow = page.locator(`#levelStats .level-stat-row[data-level-stat="${DATA[0].level}"]`);
        await expect(firstLevelRow.locator(".level-stat-counts .pass")).not.toHaveText("0✓");
    });

    test("level stats show 100% for a level when all its items are answered yes", async ({ page }) => {
        const firstLevel = DATA[0].level;
        const firstLevelYesButtons = page.locator(`.principle-card.${firstLevel} .yes-btn`);
        const count = await firstLevelYesButtons.count();
        for (let i = 0; i < count; i++) {
            await answerYes(page, firstLevelYesButtons.nth(i));
        }
        const firstLevelRow = page.locator(`#levelStats .level-stat-row[data-level-stat="${firstLevel}"]`);
        await expect(firstLevelRow.locator(".level-stat-pct")).toHaveText("100%");
    });

    test("total progress row is visible in print media", async ({ page }) => {
        await page.emulateMedia({ media: "print" });
        await expect(page.locator('#levelStats [data-level-stat="total"]')).toBeVisible();
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

    test("reason textarea enforces 250 character max length", async ({ page }) => {
        await page.locator(".no-btn").first().click();
        const reasonInput = page.locator(".reason-input").first();
        await expect(reasonInput).toHaveAttribute("maxlength", "250");
        await reasonInput.fill("x".repeat(300));
        await expect(reasonInput).toHaveValue("x".repeat(250));
    });

    test("reason textarea shows live character counter", async ({ page }) => {
        await page.locator(".no-btn").first().click();
        const reasonInput = page.locator(".reason-input").first();
        const reasonCounter = page.locator(".reason-counter").first();
        await expect(reasonCounter).toHaveText("0/250");
        await reasonInput.fill("abc");
        await expect(reasonCounter).toHaveText("3/250");
    });

    test("reason counter turns yellow when more than half the limit is used", async ({ page }) => {
        await page.locator(".no-btn").first().click();
        const reasonInput = page.locator(".reason-input").first();
        const reasonCounter = page.locator(".reason-counter").first();
        await reasonInput.fill("x".repeat(126));
        await expect(reasonCounter).toHaveClass(/warn/);
        await expect(reasonCounter).not.toHaveClass(/limit/);
    });

    test("reason counter turns red when the character limit is reached", async ({ page }) => {
        await page.locator(".no-btn").first().click();
        const reasonInput = page.locator(".reason-input").first();
        const reasonCounter = page.locator(".reason-counter").first();
        await reasonInput.fill("x".repeat(250));
        await expect(reasonCounter).toHaveClass(/limit/);
        await expect(reasonCounter).not.toHaveClass(/warn/);
    });

    test("reason counter has no color class when below half the limit", async ({ page }) => {
        await page.locator(".no-btn").first().click();
        const reasonInput = page.locator(".reason-input").first();
        const reasonCounter = page.locator(".reason-counter").first();
        await reasonInput.fill("x".repeat(10));
        await expect(reasonCounter).not.toHaveClass(/warn/);
        await expect(reasonCounter).not.toHaveClass(/limit/);
    });

    test("reason textarea uses single row and is not resizable via drag", async ({ page }) => {
        const reasonInput = page.locator(".reason-input").first();
        await expect(reasonInput).toHaveAttribute("rows", "1");
        const resize = await reasonInput.evaluate((el) => getComputedStyle(el).resize);
        expect(resize).toBe("none");
    });

    test("reason textarea retains value when switching no to yes and back", async ({ page }) => {
        const noButton = page.locator(".no-btn").first();
        const yesButton = page.locator(".yes-btn").first();
        const reasonInput = page.locator(".reason-input").first();
        const reasonCounter = page.locator(".reason-counter").first();

        await noButton.click();
        await reasonInput.fill("abc");
        await yesButton.click();
        await noButton.click();

        await expect(reasonInput).toHaveValue("abc");
        await expect(reasonCounter).toHaveText("3/250");
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

    // Regression test: reason textarea must auto-resize to fit saved content on fresh page load.
    test("reason textarea auto-resizes to fit saved content on fresh navigation", async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();

        await page.goto("/");

        await page.locator(".no-btn").first().click();
        const reasonInput = page.locator(".reason-input").first();
        // Fill with enough text to span multiple lines
        const longText = "This is a long reason that should cause the textarea to expand beyond one row. ".repeat(3);
        await reasonInput.fill(longText);

        // Capture the expanded height from the first visit
        const heightAfterFill = await reasonInput.evaluate((el) => el.offsetHeight);

        // Open a new page in the same context so localStorage is shared
        const page2 = await context.newPage();
        await page2.goto("/");

        const reasonInput2 = page2.locator(".reason-input").first();
        await expect(reasonInput2).toBeVisible();

        // The textarea height on reload should match the expanded height from the first visit,
        // not collapse to a single-row height.
        const heightOnReload = await reasonInput2.evaluate((el) => el.offsetHeight);
        expect(heightOnReload).toBeGreaterThanOrEqual(heightAfterFill);

        await context.close();
    });
});
