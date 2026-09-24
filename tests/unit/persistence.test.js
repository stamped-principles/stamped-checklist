import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import archive from "../../src/data/checklist-versions.json" with { type: "json" };
const { checklist: originalChecklist, principles: originalPrinciples } = archive["0.1.0"];

// Two full release pairs: the original checklist and the proposed M.4 addition.
const nextChecklist = structuredClone(originalChecklist);
delete nextChecklist.version;
nextChecklist.checklist_version = "0.3.0";
nextChecklist.principles_version = "0.2.0";
nextChecklist.data[1].entries.splice(3, 0, {
    principle_codes: ["M.4"],
    items: [{ id: "stamped-checklist:should/009", text: "Are access requirements separated?" }],
});
const nextPrinciples = structuredClone(originalPrinciples);
nextPrinciples.version = "0.2.0";
nextPrinciples.principles.push({
    code: "M.4",
    category: "modular",
    level: "should",
    statement: "Separate access requirements.",
});
const answer = { value: "no", reason: "Needs a fresh environment" };
const stableId = "stamped-checklist:should/004";
const encoded = (value) => encodeURIComponent(btoa(JSON.stringify(value)));

async function build(url = "/") {
    document.body.innerHTML =
        '<div id="app"></div><div id="levelStats"></div><div id="toast"></div><div id="version-indicator"></div><select id="checklist-version"></select>';
    window.history.replaceState({}, "", url);
    vi.resetModules();
    vi.doMock("../../src/data/stamped-checklist.json", () => ({ default: nextChecklist }));
    vi.doMock("../../src/data/stamped-principles.json", () => ({ default: nextPrinciples }));
    vi.doMock("../../src/data/checklist-versions.json", () => ({
        default: {
            "0.1.0": { checklist: originalChecklist, principles: originalPrinciples },
            "0.3.0": { checklist: nextChecklist, principles: nextPrinciples },
        },
    }));
    const script = await import("../../src/script.js");
    script.buildChecklist();
    return script;
}
function expectOriginal(expected = answer) {
    expect(document.querySelectorAll(".check-item").length).toBe(30);
    expect(document.getElementById("version-indicator").textContent).toBe("Checklist v0.1.0");
    expect(document.getElementById("reason_s1_p3_i0").value).toBe(expected.reason);
    expect(document.getElementById(`${expected.value}_s1_p3_i0`).classList.contains("active")).toBe(true);
    expect(document.body.textContent).not.toContain("Separate access requirements.");
}
beforeEach(() => localStorage.clear());
afterEach(() => {
    for (const name of ["stamped-checklist", "stamped-principles", "checklist-versions"]) {
        vi.doUnmock(`../../src/data/${name}.json`);
    }
    vi.restoreAllMocks();
});

describe("assessments keep their original checklist", () => {
    for (const transport of ["browser", "responses", "state", "combined"]) {
        it(`opens old ${transport} answers with the original questions, not M.4`, async () => {
            const responses = { s1_p3_i0: answer };
            const saved = JSON.stringify({ responses });
            let url = "/";
            if (transport === "browser") localStorage.setItem("stamped_checklist", saved);
            if (transport === "responses") url = `/?responses=${encoded(responses)}`;
            if (transport === "state" || transport === "combined")
                url = `/?state=${btoa("0".repeat(20) + "1" + "0".repeat(9))}`;
            if (transport === "combined") url += `&responses=${encoded(responses)}`;
            await build(url);
            expectOriginal(transport === "state" ? { value: "yes", reason: "" } : answer);
            expect(new URLSearchParams(window.location.search).get("checklist")).toBe("0.1.0");
            if (transport === "browser") expect(localStorage.getItem("stamped_checklist")).toBe(saved);
        });
    }
    it("opens pre-release format 2 links without a checklist version against the original checklist", async () => {
        await build(`/?format=2&responses=${encoded({ [stableId]: answer })}`);
        expectOriginal();
    });
    it("opens a new assessment against the default checklist", async () => {
        await build();
        expect(document.querySelectorAll(".check-item").length).toBe(31);
        expect(document.getElementById("version-indicator").textContent).toBe("Checklist v0.3.0");
        expect(document.querySelectorAll(".response-btn.active").length).toBe(0);
    });
    it("keeps browser assessments separate when selecting a different checklist", async () => {
        let script = await build("/?checklist=0.1.0");
        script.handleResponse("s1_p3_i0", "no");
        script.handleReason("s1_p3_i0", answer.reason);
        const oldSave = localStorage.getItem("stamped_checklist:0.1.0");
        const oldURL = window.location.search;
        script = await build("/?checklist=0.3.0");
        expect(document.querySelectorAll(".response-btn.active").length).toBe(0);
        script.handleResponse("s1_p3_i0", "yes"); // M.4 belongs only to the new assessment.
        expect(JSON.parse(localStorage.getItem("stamped_checklist:0.3.0")).checklist_version).toBe("0.3.0");
        expect(localStorage.getItem("stamped_checklist:0.1.0")).toBe(oldSave);
        await build("/?checklist=0.1.0");
        expectOriginal();
        await build(oldURL);
        expectOriginal();
        await build("/?checklist=0.3.0");
        expect(document.getElementById("yes_s1_p3_i0").classList.contains("active")).toBe(true);
    });

    it("preserves an old browser save when a new-version assessment is saved first", async () => {
        const oldSave = JSON.stringify({ responses: { s1_p3_i0: answer } });
        localStorage.setItem("stamped_checklist", oldSave);
        const script = await build("/?checklist=0.3.0");
        script.handleResponse("s1_p3_i0", "yes");
        expect(localStorage.getItem("stamped_checklist:0.1.0")).toBe(oldSave);
        await build("/?checklist=0.1.0");
        expectOriginal();
    });
    it("saves and reopens the version and full answers through a link without browser storage", async () => {
        const script = await build("/?checklist=0.3.0");
        script.handleResponse("s1_p4_i0", "no");
        script.handleReason("s1_p4_i0", answer.reason);
        const url = window.location.search;
        script.saveToLocalStorage();
        expect(JSON.parse(localStorage.getItem("stamped_checklist"))).toEqual({
            format: 2,
            checklist_version: "0.3.0",
            responses: { [stableId]: answer },
        });
        localStorage.clear();
        await build(url);
        expect(document.getElementById("reason_s1_p4_i0").value).toBe(answer.reason);
        expect(document.querySelectorAll(".check-item").length).toBe(31);
    });
    it("does not replace a missing checklist version with current questions or overwrite its answers", async () => {
        const original = JSON.stringify({ format: 2, checklist_version: "9.9.9", responses: { [stableId]: answer } });
        localStorage.setItem("stamped_checklist", original);
        const script = await build();
        expect(document.querySelector('[role="alert"]').textContent).toContain("9.9.9");
        expect(document.querySelectorAll(".check-item").length).toBe(0);
        script.saveToLocalStorage();
        expect(localStorage.getItem("stamped_checklist")).toBe(original);
        expect(window.location.search).toBe("");
    });
    it("preserves a link naming an unavailable version", async () => {
        const url = `/?checklist=9.9.9&format=2&responses=${encoded({ [stableId]: answer })}`;
        await build(url);
        expect(document.querySelector('[role="alert"]').textContent).toContain("9.9.9");
        expect(window.location.search).toBe(url.slice(1));
    });
    it("view-only links reopen saved answers with their own checklist", async () => {
        localStorage.setItem("stamped_checklist", JSON.stringify({ responses: { s1_p3_i0: answer } }));
        await build("/?cols=1");
        expectOriginal();
    });
    it("an explicit empty assessment overrides browser answers", async () => {
        localStorage.setItem("stamped_checklist", JSON.stringify({ responses: { s1_p3_i0: answer } }));
        await build(`/?checklist=0.3.0&format=2&responses=${encoded({})}`);
        expect(document.querySelectorAll(".response-btn.active").length).toBe(0);
        expect(document.querySelectorAll(".check-item").length).toBe(31);
    });
    for (const url of ["/?format=99&responses=e30=", "/?format=2", `/?state=${btoa("1")}`]) {
        it(`preserves an unreadable assessment: ${url}`, async () => {
            vi.spyOn(console, "warn").mockImplementation(() => {});
            const script = await build(url);
            expect(document.getElementById("toast").textContent).toContain("could not be restored");
            script.handleResponse("s0_p0_i0", "yes");
            expect(window.location.search).toBe(url.slice(1));
            expect(localStorage.getItem("stamped_checklist")).toBeNull();
        });
    }
});
