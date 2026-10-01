import { afterEach, expect, it, vi } from "vitest";
import archive from "../../src/data/checklist-versions.json" with { type: "json" };
function previewBundle(sources, label = "review") {
    const released = archive["0.1.0"];
    const version = "0.1.0";
    const id = `${version}-preview.${sources.checklist.sha}.${sources.principles.sha}`;
    return {
        checklist: { ...released.checklist, _preview: { id, version, sources, label } },
        principles: released.principles,
    };
}

const bundle = previewBundle({
    checklist: {
        pr: 15,
        sha: "a".repeat(40),
        url: "https://github.com/stamped-principles/stamped-checklist-schema/pull/15",
    },
    principles: {
        pr: 19,
        sha: "b".repeat(40),
        url: "https://github.com/stamped-principles/stamped-principles-schema/pull/19",
    },
});
const mixedBundle = previewBundle(
    {
        checklist: {
            pr: 16,
            sha: "e".repeat(40),
            url: "https://github.com/stamped-principles/stamped-checklist-schema/pull/16",
        },
        principles: {
            tag: "v0.1.0",
            sha: "f".repeat(40),
            url: "https://github.com/stamped-principles/stamped-principles-schema/tree/v0.1.0",
        },
    },
    "review-name"
);

afterEach(() => {
    vi.doUnmock("../../src/data/stamped-checklist.json");
    vi.doUnmock("../../src/data/stamped-principles.json");
    vi.doUnmock("../../src/data/checklist-versions.json");
    vi.resetModules();
    localStorage.clear();
});

it("identifies both preview sources and isolates saved preview answers from releases", async () => {
    const script = await openPreview("/");
    const notice = document.querySelector('[data-message="schema-preview"]');
    expect(notice.textContent).toContain("Unreleased schema preview");
    expect([...notice.querySelectorAll("a")].map((a) => a.href)).toEqual([
        "https://github.com/stamped-principles/stamped-checklist-schema/pull/15",
        "https://github.com/stamped-principles/stamped-principles-schema/pull/19",
    ]);
    expect(document.querySelector("#checklist-version option:checked").textContent).toBe(
        "Schema preview: review (0.1.0)"
    );
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

const oldPreview = `0.1.0-preview.${"c".repeat(40)}.${"d".repeat(40)}`;
const encoded = (version) =>
    encodeURIComponent(
        btoa(
            JSON.stringify({
                checklist_version: version,
                responses: { "stamped-checklist:must/001": { value: "yes", reason: "Draft answer" } },
            })
        )
    );
async function openPreview(url, defaultBundle = bundle, additionalBundles = {}) {
    document.body.innerHTML =
        '<div id="app"></div><div id="levelStats"></div><div id="toast"></div><div id="version-indicator"></div><select id="checklist-version"></select>';
    window.history.replaceState({}, "", url);
    vi.resetModules();
    vi.doMock("../../src/data/stamped-checklist.json", () => ({ default: defaultBundle.checklist }));
    vi.doMock("../../src/data/stamped-principles.json", () => ({ default: defaultBundle.principles }));
    vi.doMock("../../src/data/checklist-versions.json", () => ({ default: { ...archive, ...additionalBundles } }));
    const script = await import("../../src/script.js");
    script.buildChecklist();
    return script;
}
it.each([oldPreview, bundle.checklist._preview.id])(
    "opens current preview unanswered when source pins are stale (target %s)",
    async (target) => {
        const saved = JSON.stringify({
            format: 3,
            checklist_version: bundle.checklist._preview.id,
            responses: { "stamped-checklist:must/001": { value: "yes", reason: "Cached answer" } },
        });
        localStorage.setItem(`stamped_checklist:${bundle.checklist._preview.id}`, saved);
        const script = await openPreview(`/?checklist=${target}&format=3&responses=${encoded(oldPreview)}&cols=2`);
        expect(document.querySelector('[data-message="preview-updated"]').textContent).toContain(
            "current preview is unanswered"
        );
        expect(document.querySelector(".version-error")).toBeNull();
        expect(document.querySelector(".transfer-summary")).toBeNull();
        const params = new URLSearchParams(window.location.search);
        expect(params.get("checklist")).toBe(bundle.checklist._preview.id);
        expect(params.get("cols")).toBe("2");
        expect(JSON.parse(atob(params.get("responses"))).responses).toEqual({});
        expect(localStorage.getItem(`stamped_checklist:${bundle.checklist._preview.id}`)).toBe(saved);
        script.handleResponse("s0_p0_i0", "yes");
        expect(
            JSON.parse(localStorage.getItem("stamped_checklist")).responses["stamped-checklist:must/001"].value
        ).toBe("yes");
    }
);
it("restores answers for unchanged preview pins", async () => {
    await openPreview(
        `/?checklist=${bundle.checklist._preview.id}&format=3&responses=${encoded(bundle.checklist._preview.id)}`
    );
    expect(document.querySelector('[data-message="preview-updated"]')).toBeNull();
    expect(
        JSON.parse(atob(new URLSearchParams(window.location.search).get("responses"))).responses[
            "stamped-checklist:must/001"
        ].value
    ).toBe("yes");
});
it("keeps unavailable released URLs unchanged even in a preview build", async () => {
    const url = "/?checklist=9.9.9&format=3&responses=" + encoded("9.9.9");
    await openPreview(url);
    expect(window.location.search).toBe(url.slice(1));
    expect(document.querySelector(".version-error")).not.toBeNull();
    expect(document.querySelector('[data-message="preview-updated"]')).toBeNull();
});

it("restores an available nondefault preview without discarding its answers", async () => {
    const id = mixedBundle.checklist._preview.id;
    await openPreview(`/?checklist=${id}&responses_version=${id}&format=3&responses=${encoded(id)}`, bundle, {
        [id]: mixedBundle,
    });
    expect(document.querySelector('[data-message="preview-updated"]')).toBeNull();
    expect(document.querySelector(".version-error")).toBeNull();
    expect(document.querySelector("#yes_s0_p0_i0").classList.contains("active")).toBe(true);
    const params = new URLSearchParams(window.location.search);
    expect(params.get("checklist")).toBe(id);
    expect(JSON.parse(atob(params.get("responses"))).checklist_version).toBe(id);
    expect(JSON.parse(atob(params.get("responses"))).responses["stamped-checklist:must/001"].value).toBe("yes");
});

it("shows a friendly preview label and both PR and release-tag sources", async () => {
    await openPreview("/", mixedBundle);
    expect(document.querySelector("#checklist-version option:checked").textContent).toBe(
        "Schema preview: review-name (0.1.0)"
    );
    expect(document.querySelector("#version-indicator").textContent).toBe("Schema preview: review-name (0.1.0)");
    const links = [...document.querySelectorAll('[data-message="schema-preview"] a')];
    expect(links.map((link) => link.textContent)).toEqual([
        "checklist PR #16 (eeeeeee)",
        "principles v0.1.0 (fffffff)",
    ]);
    expect(links.map((link) => link.href)).toEqual([
        mixedBundle.checklist._preview.sources.checklist.url,
        mixedBundle.checklist._preview.sources.principles.url,
    ]);
    expect(new URLSearchParams(window.location.search).get("checklist")).toBe(mixedBundle.checklist._preview.id);
});

it("restores a configured preview alongside a released default", async () => {
    const id = mixedBundle.checklist._preview.id;
    const saved = JSON.stringify({
        format: 3,
        checklist_version: id,
        responses: { "stamped-checklist:must/001": { value: "yes", reason: "Cached draft answer" } },
    });
    localStorage.setItem(`stamped_checklist:${id}`, saved);
    await openPreview(`/?checklist=${id}`, archive["0.1.0"], { [id]: mixedBundle });
    expect(document.querySelector('[data-message="preview-updated"]')).toBeNull();
    expect(document.querySelector('[data-message="older-version"]')).toBeNull();
    expect(document.querySelector("#yes_s0_p0_i0").classList.contains("active")).toBe(true);
    expect(document.querySelector("#checklist-version").value).toBe(id);
    expect([...document.querySelectorAll("#checklist-version option")].map((option) => option.value)).toContain(
        "0.1.0"
    );
    expect(localStorage.getItem(`stamped_checklist:${id}`)).toBe(saved);
});

it("preserves unavailable preview URLs when the default is released", async () => {
    const url = `/?checklist=${oldPreview}&format=3&responses=${encoded(oldPreview)}`;
    await openPreview(url, archive["0.1.0"], { [mixedBundle.checklist._preview.id]: mixedBundle });
    expect(window.location.search).toBe(url.slice(1));
    expect(document.querySelector(".version-error")).not.toBeNull();
    expect(document.querySelector('[data-message="preview-updated"]')).toBeNull();
});
