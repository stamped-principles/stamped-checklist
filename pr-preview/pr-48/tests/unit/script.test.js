import { beforeEach, describe, it, expect, vi } from "vitest";
import { DATA } from "../../checklist.js";

// Set up a minimal DOM before importing script.js so that module-level
// code that queries the DOM doesn't throw.
function setupDOM() {
    document.body.innerHTML = `
        <div id="app"></div>
        <div class="progress-bar" id="progressBar" style="width:0%"></div>
        <div id="progressText"></div>
        <div id="toast"></div>
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

    it("initial getState returns all false", () => {
        const state = script.getState();
        const allFalse = Object.values(state).every((v) => v === false);
        expect(allFalse).toBe(true);
    });

    it("setState updates checkbox state and DOM", () => {
        const id = script.generateId(0, 0, 0);
        script.setState({ [id]: true });
        const state = script.getState();
        expect(state[id]).toBe(true);
        const cb = document.getElementById(id);
        expect(cb.checked).toBe(true);
    });

    it("setState with false unchecks the checkbox", () => {
        const id = script.generateId(0, 0, 0);
        script.setState({ [id]: true });
        script.setState({ [id]: false });
        const state = script.getState();
        expect(state[id]).toBe(false);
        const cb = document.getElementById(id);
        expect(cb.checked).toBe(false);
    });

    it("setState ignores unknown ids", () => {
        const initialState = { ...script.getState() };
        script.setState({ unknown_id: true });
        expect(script.getState()).toEqual(initialState);
    });

    it("updateAllCounts reflects checked items", () => {
        const id = script.generateId(0, 0, 0);
        script.setState({ [id]: true });
        script.updateAllCounts();
        const countEl = document.getElementById("count_0_0");
        const [checked] = countEl.textContent.split("/").map(Number);
        expect(checked).toBe(1);
    });

    it("updateAllCounts marks card complete when all items checked", () => {
        // Check all items in first principle
        const firstPrinciple = DATA[0].principles[0];
        firstPrinciple.items.forEach((_, ii) => {
            const id = script.generateId(0, 0, ii);
            script.setState({ [id]: true });
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

describe("setColumns", () => {
    beforeEach(async () => {
        setupDOM();
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
});

describe("setSections", () => {
    beforeEach(async () => {
        setupDOM();
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
});
