import { afterEach, expect, it, vi } from "vitest";
import archive from "../../src/data/checklist-versions.json" with { type: "json" };
import { previewBundle } from "../../src/scripts/schema-preview.mjs";

const bundle = previewBundle(
    { checklist: { pr: 15, sha: "a".repeat(40) }, principles: { pr: 19, sha: "b".repeat(40) } },
    archive["0.1.0"].checklist,
    archive["0.1.0"].principles
);

afterEach(() => {
    vi.doUnmock("../../src/data/stamped-checklist.json");
    vi.doUnmock("../../src/data/stamped-principles.json");
    vi.resetModules();
    localStorage.clear();
});

it("identifies both preview sources and isolates saved preview answers from releases", async () => {
    document.body.innerHTML =
        '<div id="app"></div><div id="levelStats"></div><div id="toast"></div><div id="version-indicator"></div><select id="checklist-version"></select>';
    window.history.replaceState({}, "", "/");
    localStorage.clear();
    vi.resetModules();
    vi.doMock("../../src/data/stamped-checklist.json", () => ({ default: bundle.checklist }));
    vi.doMock("../../src/data/stamped-principles.json", () => ({ default: bundle.principles }));
    const script = await import("../../src/script.js");
    script.buildChecklist();
    const notice = document.querySelector('[data-message="schema-preview"]');
    expect(notice.textContent).toContain("Unreleased schema preview");
    expect([...notice.querySelectorAll("a")].map((a) => a.href)).toEqual([
        "https://github.com/stamped-principles/stamped-checklist-schema/pull/15",
        "https://github.com/stamped-principles/stamped-principles-schema/pull/19",
    ]);
    expect(document.querySelector("#checklist-version option:checked").textContent).toBe("Schema preview (0.1.0)");
    script.handleResponse("s0_p0_i0", "yes");
    const previewSave = JSON.parse(localStorage.getItem("stamped_checklist"));
    expect(previewSave.checklist_version).toBe(bundle.checklist._preview.id);
    expect(new URLSearchParams(window.location.search).get("checklist")).toBe(bundle.checklist._preview.id);
    script.selectChecklistVersion("0.1.0");
    expect(document.querySelector('[data-message="schema-preview"]')).toBeNull();
    script.saveToLocalStorage();
    expect(JSON.parse(localStorage.getItem("stamped_checklist")).checklist_version).toBe("0.1.0");
    expect(JSON.parse(localStorage.getItem(`stamped_checklist:${bundle.checklist._preview.id}`))).toEqual(previewSave);
});
