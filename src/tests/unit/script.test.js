import { beforeEach, describe, it, expect, vi } from "vitest";
import { DATA } from "../../checklist.js";
import { GA_MEASUREMENT_ID } from "../../analytics.js";

// Set up a minimal DOM before importing script.js so that module-level
// code that queries the DOM doesn't throw.
function setupDOM() {
    document.querySelectorAll('script[src*="googletagmanager.com/gtag/js?id="]').forEach((el) => el.remove());
    document.body.innerHTML = `
        <label><input type="radio" name="cols" value="1" /></label>
        <label><input type="radio" name="cols" value="2" /></label>
        <label><input type="radio" name="cols" value="auto" checked /></label>
        <label><input type="radio" name="sections" value="on" /></label>
        <label><input type="radio" name="sections" value="off" checked /></label>
        <div id="app"></div>
        <div class="progress-bar" id="progressBar" style="width:0%"></div>
        <div id="progressText"></div>
        <div id="toast"></div>
        <div id="cookie-consent-banner" class="cookie-consent-banner hidden"></div>
        <button id="cookie-consent-decline" type="button">Decline</button>
        <button id="cookie-consent-accept" type="button">Accept</button>
        <button id="theme-toggle" type="button">☀️</button>
        <div id="version-indicator"></div>
    `;
}

describe("generateId", () => {
    it("returns expected id format", async () => {
        setupDOM();
        const { generateId } = await import("../../script.js");
        expect(generateId(0, 0, 0)).toBe("s0_p0_i0");
        expect(generateId(1, 2, 3)).toBe("s1_p2_i3");
        expect(generateId(0, 1, 10)).toBe("s0_p1_i10");
    });
});

describe("buildChecklist and state management", () => {
    let script;

    beforeEach(async () => {
        setupDOM();
        localStorage.clear();
        vi.resetModules();
        script = await import("../../script.js");
        script.buildChecklist();
    });

    it("builds checklist cards in the DOM", () => {
        const cards = document.querySelectorAll(".principle-card");
        const totalPrinciples = DATA.flatMap((s) => s.principles).length;
        expect(cards.length).toBe(totalPrinciples);
    });

    it("renders examples links for principles using first letter route", () => {
        const links = document.querySelectorAll(".principle-examples-link");
        const totalPrinciples = DATA.flatMap((s) => s.principles).length;
        expect(links.length).toBe(totalPrinciples);

        const firstLink = document.querySelector("#card_0_0 .principle-examples-link");
        expect(firstLink.getAttribute("href")).toBe(
            "https://stamped-principles.github.io/stamped-examples/stamped_principles/s/"
        );
        expect(firstLink.textContent).toBe("💡");
    });

    it("builds correct number of check items", () => {
        const items = document.querySelectorAll(".check-item");
        const totalItems = DATA.flatMap((s) => s.principles).flatMap((p) => p.items).length;
        expect(items.length).toBe(totalItems);
    });

    it("renders inline markdown code spans for checklist text", () => {
        const codeSpans = Array.from(document.querySelectorAll(".check-item .check-text code"));
        expect(codeSpans.length).toBeGreaterThan(0);
        expect(codeSpans.some((el) => el.textContent === "git")).toBe(true);

        const rawBackticks = Array.from(document.querySelectorAll(".check-item .check-text")).some((el) =>
            /`[^`]*`/.test(el.innerHTML)
        );
        expect(rawBackticks).toBe(false);
    });

    it("initial getState returns all false", () => {
        const state = script.getState();
        const allFalse = Object.values(state).every((v) => v === false);
        expect(allFalse).toBe(true);
    });

    it("setState updates yes response state and DOM", () => {
        const id = script.generateId(0, 0, 0);
        script.setState({ [id]: true });
        const state = script.getState();
        expect(state[id]).toBe(true);
        const yesBtn = document.getElementById(`yes_${id}`);
        expect(yesBtn.classList.contains("active")).toBe(true);
    });

    it("setState with false clears yes response", () => {
        const id = script.generateId(0, 0, 0);
        script.setState({ [id]: true });
        script.setState({ [id]: false });
        const state = script.getState();
        expect(state[id]).toBe(false);
        const yesBtn = document.getElementById(`yes_${id}`);
        expect(yesBtn.classList.contains("active")).toBe(false);
    });

    it("setState ignores unknown ids", () => {
        const initialState = { ...script.getState() };
        script.setState({ unknown_id: true });
        expect(script.getState()).toEqual(initialState);
    });

    it("updateAllCounts reflects yes responses", () => {
        const id = script.generateId(0, 0, 0);
        script.handleResponse(id, "yes");
        script.updateAllCounts();
        const countEl = document.getElementById("count_0_0");
        const [checked] = countEl.textContent.split("/").map(Number);
        expect(checked).toBe(1);
    });

    it("updateAllCounts marks card complete when all items are yes", () => {
        const firstPrinciple = DATA[0].principles[0];
        firstPrinciple.items.forEach((_, ii) => {
            const id = script.generateId(0, 0, ii);
            script.handleResponse(id, "yes");
        });
        script.updateAllCounts();
        const card = document.getElementById("card_0_0");
        expect(card.classList.contains("complete")).toBe(true);
    });
});

describe("section dividers", () => {
    beforeEach(async () => {
        setupDOM();
        vi.resetModules();
        const script = await import("../../script.js");
        script.buildChecklist();
    });

    it("creates section dividers for each data level", () => {
        const dividers = document.querySelectorAll(".section-divider");
        expect(dividers.length).toBe(DATA.length);
    });

    it("section dividers have correct data-level attribute", () => {
        const dividers = document.querySelectorAll(".section-divider");
        const levels = Array.from(dividers).map((d) => d.getAttribute("data-level"));
        expect(levels).toEqual(DATA.map((s) => s.level));
    });
});

describe("URL state encoding/decoding", () => {
    let script;

    beforeEach(async () => {
        setupDOM();
        localStorage.clear();
        window.history.replaceState({}, "", "/");
        vi.resetModules();
        script = await import("../../script.js");
        script.buildChecklist();
    });

    it("loadFromURL is a function", () => {
        expect(typeof script.loadFromURL).toBe("function");
    });

    it("loadFromURL handles missing URL params gracefully", () => {
        // Should not throw when there are no URL params
        expect(() => script.loadFromURL()).not.toThrow();
    });

    it("shareURL includes selected columns and sections view params", () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(navigator, "clipboard", {
            configurable: true,
            value: { writeText },
        });

        document.querySelector('input[name="cols"][value="2"]').checked = true;
        document.querySelector('input[name="sections"][value="on"]').checked = true;
        script.shareURL();

        const sharedURL = new URL(writeText.mock.calls[0][0]);
        expect(sharedURL.searchParams.get("cols")).toBe("2");
        expect(sharedURL.searchParams.get("sections")).toBe("on");
    });

    it("loadFromURL applies view params and keeps them in URL", () => {
        window.history.replaceState({}, "", "/?cols=1&sections=on");

        script.loadFromURL();

        const grid = document.querySelector(".cards-grid");
        const app = document.getElementById("app");
        expect(grid.classList.contains("cols-1")).toBe(true);
        expect(app.classList.contains("flat-mode")).toBe(false);
        expect(window.location.search).toBe("?cols=1&sections=on");
    });

    it("loadFromURL ignores invalid view params and removes them from URL", () => {
        window.history.replaceState({}, "", "/?cols=3&sections=invalid");

        expect(() => script.loadFromURL()).not.toThrow();
        expect(window.location.search).toBe("");
        expect(document.querySelector(".cards-grid").classList.contains("cols-auto")).toBe(true);
        expect(document.getElementById("app").classList.contains("flat-mode")).toBe(true);
    });

    it("loadFromURL view params override and persist over prior localStorage preferences", () => {
        localStorage.setItem("stamped_cols", "auto");
        localStorage.setItem("stamped_sections", "off");
        window.history.replaceState({}, "", "/?cols=2&sections=on");

        script.loadFromURL();

        expect(localStorage.getItem("stamped_cols")).toBe("2");
        expect(localStorage.getItem("stamped_sections")).toBe("on");
        expect(document.querySelector(".cards-grid").classList.contains("cols-2")).toBe(true);
        expect(document.getElementById("app").classList.contains("flat-mode")).toBe(false);
    });

    it("defaults columns to auto when URL has no cols param", () => {
        localStorage.setItem("stamped_cols", "2");
        localStorage.setItem("stamped_sections", "on");
        window.history.replaceState({}, "", "/");

        script.loadFromURL();
        script.loadColumnPreference();
        script.loadSectionsPreference();

        expect(document.querySelector(".cards-grid").classList.contains("cols-auto")).toBe(true);
        expect(document.getElementById("app").classList.contains("flat-mode")).toBe(false);
    });
});

describe("showToast", () => {
    beforeEach(async () => {
        setupDOM();
        vi.resetModules();
        const script = await import("../../script.js");
        script.buildChecklist();
    });

    it("sets toast text content", async () => {
        const { showToast } = await import("../../script.js");
        showToast("Test message");
        const toast = document.getElementById("toast");
        expect(toast.textContent).toBe("Test message");
    });

    it("adds show class to toast", async () => {
        const { showToast } = await import("../../script.js");
        showToast("Test");
        const toast = document.getElementById("toast");
        expect(toast.classList.contains("show")).toBe(true);
    });
});

describe("cookie consent and analytics", () => {
    let script;

    beforeEach(async () => {
        setupDOM();
        localStorage.clear();
        vi.resetModules();
        script = await import("../../script.js");
    });

    it("shows cookie banner when consent is missing", () => {
        script.init();
        const banner = document.getElementById("cookie-consent-banner");
        expect(banner.classList.contains("hidden")).toBe(false);
    });

    it("accepting consent hides banner and loads analytics", () => {
        script.init();
        document.getElementById("cookie-consent-accept").click();

        const banner = document.getElementById("cookie-consent-banner");
        const analyticsScript = document.querySelector(
            `script[src="https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"]`
        );

        expect(localStorage.getItem("stamped_cookie_consent")).toBe("accepted");
        expect(banner.classList.contains("hidden")).toBe(true);
        expect(analyticsScript).not.toBeNull();
    });

    it("declining consent hides banner and does not load analytics", () => {
        script.init();
        document.getElementById("cookie-consent-decline").click();

        const banner = document.getElementById("cookie-consent-banner");
        const analyticsScript = document.querySelector(
            `script[src="https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"]`
        );

        expect(localStorage.getItem("stamped_cookie_consent")).toBe("declined");
        expect(banner.classList.contains("hidden")).toBe(true);
        expect(analyticsScript).toBeNull();
    });
});

describe("theme toggle", () => {
    beforeEach(() => {
        setupDOM();
        localStorage.clear();
        delete window.matchMedia;
    });

    it("defaults to light mode when browser preference API is unavailable", async () => {
        vi.resetModules();
        const script = await import("../../script.js");
        script.init();

        expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    });

    it("defaults to dark mode when browser preference is dark", async () => {
        window.matchMedia = vi.fn(() => ({ matches: true }));
        vi.resetModules();
        const script = await import("../../script.js");
        script.init();

        expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    });

    it("toggles theme and stores user preference", async () => {
        window.matchMedia = vi.fn(() => ({ matches: false }));
        vi.resetModules();
        const script = await import("../../script.js");
        script.init();

        document.getElementById("theme-toggle").click();

        expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
        expect(localStorage.getItem("stamped_theme")).toBe("dark");
    });
});

describe("setColumns", () => {
    beforeEach(async () => {
        setupDOM();
        window.history.replaceState({}, "", "/");
        localStorage.clear();
        // Add cards-grid to DOM for setColumns to operate on
        document.getElementById("app").innerHTML = `<div class="cards-grid cols-auto"></div>`;
        vi.resetModules();
    });

    it("sets the correct column class", async () => {
        const { setColumns } = await import("../../script.js");
        setColumns(1);
        const grid = document.querySelector(".cards-grid");
        expect(grid.classList.contains("cols-1")).toBe(true);
        expect(grid.classList.contains("cols-auto")).toBe(false);
    });

    it("removes previous column class when switching", async () => {
        const { setColumns } = await import("../../script.js");
        setColumns(2);
        setColumns("auto");
        const grid = document.querySelector(".cards-grid");
        expect(grid.classList.contains("cols-auto")).toBe(true);
        expect(grid.classList.contains("cols-2")).toBe(false);
    });

    it("updates URL in real time when columns change", async () => {
        const { setColumns } = await import("../../script.js");
        setColumns(2);
        expect(window.location.search).toBe("?cols=2");
    });
});

describe("setSections", () => {
    beforeEach(async () => {
        setupDOM();
        window.history.replaceState({}, "", "/");
        localStorage.clear();
        vi.resetModules();
    });

    it("adds flat-mode class when sections off", async () => {
        const { setSections } = await import("../../script.js");
        setSections("off");
        const container = document.getElementById("app");
        expect(container.classList.contains("flat-mode")).toBe(true);
    });

    it("removes flat-mode class when sections on", async () => {
        const { setSections } = await import("../../script.js");
        setSections("off");
        setSections("on");
        const container = document.getElementById("app");
        expect(container.classList.contains("flat-mode")).toBe(false);
    });

    it("updates URL in real time when sections change", async () => {
        const { setSections } = await import("../../script.js");
        setSections("on");
        expect(window.location.search).toBe("?sections=on");
    });

    it("preserves both cols and sections params in URL when both settings are applied", async () => {
        const { setColumns, setSections } = await import("../../script.js");
        document.getElementById("app").innerHTML = `<div class="cards-grid cols-auto"></div>`;
        setColumns(1);
        setSections("on");
        expect(window.location.search).toBe("?cols=1&sections=on");
    });
});
