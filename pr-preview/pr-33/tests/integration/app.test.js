import { test, expect } from "@playwright/test";
import DATA from "../../checklist.json" with { type: "json" };

const TOTAL_PRINCIPLES = DATA.flatMap((s) => s.principles).length;

// Checkboxes use display:none and are toggled via their sibling label.
// Click the label using its "for" attribute to trigger the change event.
async function checkItem(page, checkboxLocator) {
    const id = await checkboxLocator.getAttribute("id");
    await page.locator(`label[for="${id}"]`).click();
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

    test("initial progress shows 0 items checked", async ({ page }) => {
        const progressText = page.locator("#progressText");
        await expect(progressText).toContainText("0 /");
        await expect(progressText).toContainText("(0%)");
    });

    test("checking an item updates the principle counter", async ({ page }) => {
        const firstCounter = page.locator("#count_0_0");
        await expect(firstCounter).toContainText("0/");

        await checkItem(page, page.locator(".check-item input[type=checkbox]").first());

        await expect(firstCounter).toContainText("1/");
    });

    test("checking all items in a principle marks it complete", async ({ page }) => {
        const firstCard = page.locator("#card_0_0");
        await expect(firstCard).not.toHaveClass(/complete/);

        const checkboxes = firstCard.locator("input[type=checkbox]");
        const count = await checkboxes.count();
        for (let i = 0; i < count; i++) {
            await checkItem(page, checkboxes.nth(i));
        }

        await expect(firstCard).toHaveClass(/complete/);
    });

    test("progress bar percentage updates after checking items", async ({ page }) => {
        await checkItem(page, page.locator(".check-item input[type=checkbox]").first());
        await expect(page.locator("#progressText")).not.toContainText("(0%)");
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

    test("mode toggle switches between checkboxes and responses", async ({ page }) => {
        const app = page.locator("#app");

        await clickToolbarOption(page, "mode", "responses");
        await expect(app).toHaveClass(/mode-responses/);

        await clickToolbarOption(page, "mode", "checkboxes");
        await expect(app).not.toHaveClass(/mode-responses/);
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

    test("save button triggers toast notification", async ({ page }) => {
        await page.locator("button", { hasText: "Save" }).click();
        await expect(page.locator("#toast")).toHaveClass(/show/);
    });

    test("reset button resets checked state", async ({ page }) => {
        // Check an item first
        await checkItem(page, page.locator(".check-item input[type=checkbox]").first());
        await expect(page.locator("#count_0_0")).toContainText("1/");

        // Accept the reset confirmation dialog
        page.on("dialog", (dialog) => dialog.accept());
        await page.locator("button.danger").click();

        await expect(page.locator("#count_0_0")).toContainText("0/");
    });

    test("response mode shows yes/no buttons", async ({ page }) => {
        await clickToolbarOption(page, "mode", "responses");
        await expect(page.locator(".yes-btn").first()).toBeVisible();
        await expect(page.locator(".no-btn").first()).toBeVisible();
    });

    test("response mode no button reveals reason textarea", async ({ page }) => {
        await clickToolbarOption(page, "mode", "responses");
        await page.locator(".no-btn").first().click();
        await expect(page.locator(".reason-input").first()).toHaveClass(/visible/);
    });

    // Use a fresh browser context (not affected by addInitScript) to verify
    // that autoSave persists state across page loads.
    test("state persists in localStorage after checking items", async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();

        await page.goto("/");

        // Check the first item
        const id = await page.locator(".check-item input[type=checkbox]").first().getAttribute("id");
        await page.locator(`label[for="${id}"]`).click();

        // Verify it is checked
        await expect(page.locator(`#${id}`)).toBeChecked();

        // Open a new page in the same context — localStorage is shared within a context
        const page2 = await context.newPage();
        await page2.goto("/");

        // The first checkbox should still be checked (restored from localStorage)
        await expect(page2.locator(`#${id}`)).toBeChecked();

        await context.close();
    });
});
