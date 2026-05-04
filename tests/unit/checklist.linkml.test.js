import { describe, expect, it } from "vitest";
import { CHECKLIST as checklist, PRINCIPLES as principles } from "../../src/checklist.js";

const SEMVER_PATTERN = /^\d+\.\d+\.\d+$/;
const PRINCIPLE_CODE_PATTERN = /^[A-Z]\.[1-9][0-9]*$/;
const ITEM_ID_PATTERN = /^stamped-checklist:(must|should|may)\//;

describe("LinkML checklist JSON", () => {
    it("matches top-level LinkML Checklist constraints", () => {
        expect(typeof checklist.version).toBe("string");
        expect(checklist.version).toMatch(SEMVER_PATTERN);
        expect(typeof checklist.principles_version).toBe("string");
        expect(checklist.principles_version).toMatch(SEMVER_PATTERN);
        expect(Array.isArray(checklist.data)).toBe(true);
        expect(checklist.data.length).toBeGreaterThan(0);
    });

    it("has valid level groups and entries", () => {
        const validLevels = new Set(["must", "should", "may"]);
        const principleCodes = new Set(principles.principles.map((principle) => principle.code));
        const seenItemIds = new Set();

        checklist.data.forEach((group) => {
            expect(validLevels.has(group.level)).toBe(true);
            expect(Array.isArray(group.entries)).toBe(true);
            expect(group.entries.length).toBeGreaterThan(0);

            group.entries.forEach((entry) => {
                expect(Array.isArray(entry.principle_codes)).toBe(true);
                expect(entry.principle_codes.length).toBeGreaterThan(0);
                entry.principle_codes.forEach((code) => {
                    expect(code).toMatch(PRINCIPLE_CODE_PATTERN);
                    expect(principleCodes.has(code)).toBe(true);
                });

                expect(Array.isArray(entry.items)).toBe(true);
                expect(entry.items.length).toBeGreaterThan(0);
                entry.items.forEach((item) => {
                    expect(typeof item.id).toBe("string");
                    const match = item.id.match(ITEM_ID_PATTERN);
                    expect(match).not.toBeNull();
                    expect(match[1]).toBe(group.level);
                    expect(seenItemIds.has(item.id)).toBe(false);
                    seenItemIds.add(item.id);

                    expect(typeof item.text).toBe("string");
                    expect(item.text.trim().length).toBeGreaterThan(0);
                });
            });
        });
    });
});
