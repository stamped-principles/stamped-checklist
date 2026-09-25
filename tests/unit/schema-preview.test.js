import { describe, expect, it } from "vitest";
import { previewSources, previewBundle } from "../../src/scripts/schema-preview.mjs";

const config = {
    checklist: { pr: 15, sha: "a".repeat(40) },
    principles: { pr: 12, sha: "b".repeat(40) },
};
const checklist = { checklist_version: "0.4.0", principles_version: "0.3.0" };
const principles = { version: "0.3.0" };

describe("schema previews", () => {
    it("pins both downloads and source links to the schema repositories", () => {
        const sources = previewSources(config);
        expect(sources.checklist.dataUrl).toBe(
            `https://raw.githubusercontent.com/stamped-principles/stamped-checklist-schema/${config.checklist.sha}/stamped-checklist.json`
        );
        expect(sources.principles.url).toBe("https://github.com/stamped-principles/stamped-principles-schema/pull/12");
    });
    it.each([
        null,
        {},
        { checklist: config.checklist },
        { ...config, principles: { pr: 12, sha: "main" } },
        { ...config, checklist: { pr: -1, sha: config.checklist.sha } },
    ])("rejects incomplete or mutable pins: %j", (value) => {
        expect(() => previewSources(value)).toThrow();
    });
    it("keeps preview identity distinct from releases and every pinned revision", () => {
        const bundle = previewBundle(config, checklist, principles);
        expect(bundle.checklist._preview.id).not.toBe(checklist.checklist_version);
        const changed = previewBundle(
            { ...config, principles: { pr: 12, sha: "c".repeat(40) } },
            checklist,
            principles
        );
        expect(changed.checklist._preview.id).not.toBe(bundle.checklist._preview.id);
        expect(checklist._preview).toBeUndefined();
        expect(bundle.checklist.checklist_version).toBe("0.4.0");
    });
    it("rejects incompatible schema pairs", () => {
        expect(() => previewBundle(config, checklist, { version: "0.2.0" })).toThrow("does not match");
    });
});
