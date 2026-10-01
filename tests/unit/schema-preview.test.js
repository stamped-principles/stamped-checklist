import { describe, expect, it, vi } from "vitest";
import { buildCatalog, resolveSource, validateCatalog } from "../../src/scripts/schema-catalog.mjs";

const a = "a".repeat(40);
const b = "b".repeat(40);
const c = "c".repeat(40);
const released = { id: "0.3.1", checklist: { tag: "v0.3.1" }, principles: { tag: "v0.2.0" } };
const preview = { id: "review", checklist: { pr: 15, sha: a }, principles: { pr: 12, sha: b } };
const catalog = (...entries) => ({ default: entries[0].id, entries });
const schemas = {
    checklist: { checklist_version: "0.3.1", principles_version: "0.2.0" },
    principles: { version: "0.2.0" },
};
const resolver = async (kind, pin) => ({ sha: pin.sha || c, data: schemas[kind] });

describe("unified schema catalog", () => {
    it("keeps released identities and the explicit default", async () => {
        const result = await buildCatalog(catalog(released, preview), resolver);
        expect(result.current).toBe(result.archive["0.3.1"]);
        expect(result.current.checklist._preview).toBeUndefined();
        expect(result.hasPreviews).toBe(true);
    });
    it("supports mixed sources and several simultaneous previews", async () => {
        const mixed = { ...preview, id: "mixed", principles: released.principles };
        const result = await buildCatalog({ ...catalog(released, preview, mixed), default: "mixed" }, resolver);
        expect(Object.keys(result.archive)).toHaveLength(3);
        expect(result.current.checklist._preview.id).toBe(`0.3.1-preview.${a}.${c}`);
        expect(result.current.checklist._preview.sources.principles).toEqual({
            tag: "v0.2.0",
            sha: c,
            url: "https://github.com/stamped-principles/stamped-principles-schema/tree/v0.2.0",
        });
    });
    it("derives preview identity from both resolved SHAs, independent of friendly keys", async () => {
        const original = await buildCatalog(catalog(preview), resolver);
        const renamed = await buildCatalog(catalog({ ...preview, id: "renamed" }), resolver);
        const updated = await buildCatalog(catalog({ ...preview, principles: { pr: 12, sha: c } }), resolver);
        expect(renamed.current.checklist._preview.id).toBe(original.current.checklist._preview.id);
        expect(updated.current.checklist._preview.id).not.toBe(original.current.checklist._preview.id);
        expect(renamed.current.checklist._preview.label).toBe("renamed");
        expect(schemas.checklist._preview).toBeUndefined();
    });
    it("uses a resolved tag SHA in preview identity", async () => {
        const mixed = catalog({ ...preview, principles: released.principles });
        const before = await buildCatalog(mixed, resolver);
        const after = await buildCatalog(mixed, async (kind, pin) => ({ sha: pin.sha || b, data: schemas[kind] }));
        expect(before.current.checklist._preview.id).not.toBe(after.current.checklist._preview.id);
    });
    it.each([
        null,
        {},
        { default: "x", entries: [] },
        { ...catalog(released), default: "missing" },
        catalog(released, released),
        catalog({ ...released, id: "__proto__" }),
        catalog({ ...released, checklist: { tag: "../main" } }),
        catalog({ ...preview, checklist: { sha: "main", pr: 15 } }),
        catalog({ ...preview, checklist: { sha: a, pr: 0 } }),
        catalog({ ...preview, checklist: { sha: a, pr: 15, tag: "v0.3.1" } }),
        catalog({ ...released, extra: "code" }),
        { ...catalog(released), url: "https://attacker.example" },
    ])("rejects malformed catalogs: %j", (value) => {
        expect(() => validateCatalog(value)).toThrow();
    });
    it("rejects duplicate resolved preview assessments", async () => {
        await expect(buildCatalog(catalog(preview, { ...preview, id: "alias" }), resolver)).rejects.toThrow(
            "Duplicate assessment"
        );
    });
    it("checks release identity and pair compatibility before promotion", async () => {
        await expect(buildCatalog(catalog({ ...released, id: "9.9.9" }), resolver)).rejects.toThrow(
            "does not match released entry"
        );
        await expect(
            buildCatalog(catalog(released), async (kind) => ({
                sha: a,
                data: kind === "principles" ? { version: "9.9.9" } : schemas.checklist,
            }))
        ).rejects.toThrow("Principles version does not match");
    });
    it("rejects upstream attempts to override preview identity", async () => {
        await expect(
            buildCatalog(catalog(released), async (kind) => ({ sha: a, data: { ...schemas[kind], _preview: {} } }))
        ).rejects.toThrow("preview metadata");
    });
    it("resolves shared sources just once per build", async () => {
        const resolve = vi.fn(resolver);
        await buildCatalog(catalog(released, { ...preview, principles: released.principles }), resolve);
        expect(resolve).toHaveBeenCalledTimes(3);
    });
});

describe("immutable upstream source resolution", () => {
    const file = (data) => ({
        type: "file",
        encoding: "base64",
        content: Buffer.from(JSON.stringify(data)).toString("base64"),
    });
    it("resolves a release tag then downloads immutable content", async () => {
        const getJSON = vi
            .fn()
            .mockResolvedValueOnce({ ref: "refs/tags/v0.3.1", object: { type: "commit", sha: a } })
            .mockResolvedValueOnce(file(schemas.checklist));
        const result = await resolveSource("checklist", released.checklist, { getJSON });
        expect(result).toEqual({ sha: a, data: schemas.checklist });
        expect(getJSON.mock.calls.map(([url]) => url)).toEqual([
            "https://api.github.com/repos/stamped-principles/stamped-checklist-schema/git/ref/tags/v0.3.1",
            `https://api.github.com/repos/stamped-principles/stamped-checklist-schema/contents/stamped-checklist.json?ref=${a}`,
        ]);
    });
    it.each([{ ref: "refs/heads/v0.3.1" }, { ref: "refs/tags/other" }])(
        "rejects branch or mismatched refs",
        async (ref) => {
            await expect(resolveSource("checklist", released.checklist, { getJSON: async () => ref })).rejects.toThrow(
                "release tag"
            );
        }
    );
    it("peels annotated tags to an immutable commit", async () => {
        const getJSON = vi
            .fn()
            .mockResolvedValueOnce({ ref: "refs/tags/v0.3.1", object: { type: "tag", sha: b } })
            .mockResolvedValueOnce({ object: { type: "commit", sha: a } })
            .mockResolvedValueOnce(file(schemas.checklist));
        expect((await resolveSource("checklist", released.checklist, { getJSON })).sha).toBe(a);
        expect(getJSON.mock.calls[1][0]).toContain(`/git/tags/${b}`);
    });
    it("verifies SHA provenance, including older PR commits across pages", async () => {
        const getJSON = vi
            .fn()
            .mockResolvedValueOnce(Array.from({ length: 100 }, () => ({ sha: c })))
            .mockResolvedValueOnce([{ sha: a }])
            .mockResolvedValueOnce(file(schemas.checklist));
        expect((await resolveSource("checklist", preview.checklist, { getJSON })).sha).toBe(a);
        expect(getJSON.mock.calls[1][0]).toContain("page=2");
    });
    it("rejects commits outside the stated PR", async () => {
        await expect(
            resolveSource("checklist", preview.checklist, { getJSON: async () => [{ sha: c }] })
        ).rejects.toThrow("does not belong");
    });
    it("propagates missing tags and API failures", async () => {
        await expect(
            resolveSource("checklist", released.checklist, {
                getJSON: async () => {
                    throw new Error("404");
                },
            })
        ).rejects.toThrow("404");
    });
    it("rejects mutable resolved refs and invalid files", async () => {
        const getJSON = vi
            .fn()
            .mockResolvedValueOnce({ ref: "refs/tags/v0.3.1", object: { type: "commit", sha: "main" } });
        await expect(resolveSource("checklist", released.checklist, { getJSON })).rejects.toThrow("full commit SHA");
        await expect(
            resolveSource("checklist", preview.checklist, {
                getJSON: vi
                    .fn()
                    .mockResolvedValueOnce([{ sha: a }])
                    .mockResolvedValueOnce({ type: "symlink" }),
            })
        ).rejects.toThrow("JSON file");
    });
});
