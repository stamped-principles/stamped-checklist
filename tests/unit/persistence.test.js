import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { translateResponses } from "../../src/persistence.js";
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
            if (transport === "browser") {
                localStorage.setItem("stamped_checklist", saved);
                url = "/?checklist=0.1.0";
            }
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
    it("opens the default on a plain visit and retains older browser answers", async () => {
        const saved = JSON.stringify({ responses: { s1_p3_i0: answer } });
        localStorage.setItem("stamped_checklist", saved);
        await build();
        expect(document.getElementById("version-indicator").textContent).toBe("Checklist v0.3.0");
        expect(document.querySelectorAll(".response-btn.active").length).toBe(0);
        expect([...document.querySelectorAll("#checklist-version option")].map((option) => option.value)).toEqual([
            "0.3.0",
            "0.1.0",
        ]);
        expect(localStorage.getItem("stamped_checklist")).toBe(saved);
        await build("/?checklist=0.1.0");
        expectOriginal();
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
            format: 3,
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
        const script = await build("/?checklist=9.9.9");
        expect(document.querySelector('[role="alert"]').textContent).toContain("9.9.9");
        expect(document.querySelectorAll(".check-item").length).toBe(0);
        script.saveToLocalStorage();
        expect(localStorage.getItem("stamped_checklist")).toBe(original);
        expect(window.location.search).toBe("?checklist=9.9.9");
    });
    it("preserves a link naming an unavailable version", async () => {
        const url = `/?checklist=9.9.9&format=2&responses=${encoded({ [stableId]: answer })}`;
        await build(url);
        expect(document.querySelector('[role="alert"]').textContent).toContain("9.9.9");
        expect(window.location.search).toBe(url.slice(1));
    });
    it("view-only links use the default checklist without borrowing old answers", async () => {
        localStorage.setItem("stamped_checklist", JSON.stringify({ responses: { s1_p3_i0: answer } }));
        await build("/?cols=1");
        expect(document.getElementById("version-indicator").textContent).toBe("Checklist v0.3.0");
        expect(document.querySelectorAll(".response-btn.active").length).toBe(0);
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
            expect(document.querySelector(".dynamic-summary").textContent).toContain("could not be restored");
            script.handleResponse("s0_p0_i0", "yes");
            expect(window.location.search).toBe(url.slice(1));
            expect(localStorage.getItem("stamped_checklist")).toBeNull();
        });
    }
});

describe("version changes", () => {
    it("translates unchanged answers in both directions and leaves new questions blank", async () => {
        const script = await build(`/?checklist=0.1.0&format=2&responses=${encoded({ [stableId]: answer })}`);
        const originalURL = window.location.search;
        script.selectChecklistVersion("0.3.0");
        expect(document.getElementById("reason_s1_p4_i0").value).toBe(answer.reason);
        expect(document.getElementById("yes_s1_p3_i0").classList.contains("active")).toBe(false);
        expect(document.getElementById("no_s1_p3_i0").classList.contains("active")).toBe(false);
        const params = new URLSearchParams(window.location.search);
        expect([...params.keys()][0]).toBe("checklist");
        const payload = JSON.parse(atob(params.get("responses")));
        expect(payload.checklist_version).toBe("0.3.0");
        expect(payload.responses[stableId]).toEqual(answer);
        expect(JSON.parse(localStorage.getItem("stamped_checklist:0.1.0")).responses[stableId]).toEqual(answer);
        script.handleResponse("s1_p3_i0", "yes");
        script.selectChecklistVersion("0.1.0");
        expectOriginal();
        expect(JSON.parse(atob(new URLSearchParams(window.location.search).get("responses"))).responses).toEqual({
            [stableId]: answer,
        });
        await build(originalURL);
        expectOriginal();
    });
    it("rejects a source version that disagrees with the encoded answers", async () => {
        vi.spyOn(console, "warn").mockImplementation(() => {});
        const script = await build("/?checklist=0.1.0");
        script.handleResponse("s1_p3_i0", "no");
        const original = localStorage.getItem("stamped_checklist");
        const params = new URLSearchParams(window.location.search);
        params.set("responses_version", "0.3.0");
        const url = `/?${params}`;
        const reopened = await build(url);
        expect(document.querySelector(".dynamic-summary").textContent).toContain("could not be restored");
        expect(document.querySelectorAll(".response-btn.active").length).toBe(0);
        reopened.saveToLocalStorage();
        expect(localStorage.getItem("stamped_checklist")).toBe(original);
        expect(window.location.search).toBe(url.slice(1));
    });
    it("reset opens a blank default checklist without loading its saved answers", async () => {
        const script = await build(`/?checklist=0.1.0&format=2&responses=${encoded({ [stableId]: answer })}`);
        localStorage.setItem(
            "stamped_checklist:0.3.0",
            JSON.stringify({ format: 2, checklist_version: "0.3.0", responses: { [stableId]: answer } })
        );
        vi.spyOn(window, "confirm").mockReturnValue(true);
        script.confirmReset();
        expect(document.getElementById("version-indicator").textContent).toBe("Checklist v0.3.0");
        expect(document.querySelectorAll(".response-btn.active").length).toBe(0);
        expect(JSON.parse(localStorage.getItem("stamped_checklist:0.3.0")).responses).toEqual({});
    });
});

describe("translation checks the meaning of each question", () => {
    const source = [
        {
            level: "should",
            principles: [{ code: "M.4", desc: "Original principle", itemIds: ["item"], items: ["Original question"] }],
        },
    ];
    for (const field of ["question", "principle", "code", "level", "id"]) {
        it(`leaves an answer blank when its ${field} changes`, () => {
            const target = structuredClone(source);
            const entry = target[0].principles[0];
            if (field === "question") entry.items[0] = "Changed question";
            if (field === "principle") entry.desc = "Changed principle";
            if (field === "code") entry.code = "M.5";
            if (field === "level") target[0].level = "must";
            if (field === "id") entry.itemIds[0] = "new-item";
            expect(translateResponses({ item: answer }, source, target)).toEqual({});
        });
    }
    it("does not carry answers for removed items", () => {
        expect(translateResponses({ item: answer }, source, [])).toEqual({});
    });
});

describe("URL source and target versions", () => {
    for (const format of [2, 3]) {
        it(`translates manually edited format ${format} URLs and normalizes the source version`, async () => {
            const responses = { [stableId]: answer };
            const payload = format === 3 ? { checklist_version: "0.1.0", responses } : responses;
            await build(`/?checklist=0.3.0&responses_version=0.1.0&format=${format}&responses=${encoded(payload)}`);
            expect(document.getElementById("reason_s1_p4_i0").value).toBe(answer.reason);
            expect(document.querySelector(".transfer-summary").textContent).toBe(
                "From checklist 0.1.0: answers carried over: 1; questions unanswered: 30; answers omitted: 0. Scores use checklist 0.3.0."
            );
            const params = new URLSearchParams(window.location.search);
            expect(params.get("checklist")).toBe("0.3.0");
            expect(params.get("responses_version")).toBe("0.3.0");
            expect(JSON.parse(atob(params.get("responses"))).checklist_version).toBe("0.3.0");
            expect(localStorage.getItem("stamped_checklist")).toBeNull();
            await build(window.location.pathname + window.location.search);
            expect(document.getElementById("reason_s1_p4_i0").value).toBe(answer.reason);
            expect(document.querySelector(".transfer-summary")).toBeNull();
        });
    }
    it("uses the embedded source version for existing format 3 links", async () => {
        await build(
            `/?checklist=0.3.0&format=3&responses=${encoded({
                checklist_version: "0.1.0",
                responses: { [stableId]: answer },
            })}`
        );
        expect(document.getElementById("reason_s1_p4_i0").value).toBe(answer.reason);
        expect(document.querySelector(".transfer-summary")).not.toBeNull();
    });
    it("preserves the original URL when the source checklist is unavailable", async () => {
        vi.spyOn(console, "warn").mockImplementation(() => {});
        const url = `/?checklist=0.3.0&responses_version=9.9.9&format=2&responses=${encoded({ [stableId]: answer })}`;
        const script = await build(url);
        expect(window.location.search).toBe(url.slice(1));
        expect(document.querySelector(".dynamic-summary").textContent).toContain("could not be restored");
        script.saveToLocalStorage();
        expect(localStorage.getItem("stamped_checklist")).toBeNull();
    });
    it("reports answers omitted when moving to a checklist without the question", async () => {
        const script = await build("/?checklist=0.3.0");
        script.handleResponse("s1_p3_i0", "yes");
        script.selectChecklistVersion("0.1.0");
        expect(document.querySelector(".transfer-summary").textContent).toContain(
            "answers carried over: 0; questions unanswered: 30; answers omitted: 1"
        );
    });
});

it("shows an older-version notice but keeps a fresh current assessment uncluttered", async () => {
    await build();
    expect(document.querySelector(".dynamic-summary")).toBeNull();
    const script = await build("/?checklist=0.1.0");
    expect(document.querySelector(".older-version").textContent).toContain("Checklist version dropdown");
    script.handleResponse("s0_p0_i0", "yes");
    expect(document.querySelector(".older-version")).not.toBeNull();
    script.selectChecklistVersion("0.3.0");
    expect(document.querySelector(".older-version")).toBeNull();
    expect(document.querySelector(".transfer-summary")).not.toBeNull();
    expect(document.querySelectorAll(".dynamic-summary").length).toBe(1);
});
