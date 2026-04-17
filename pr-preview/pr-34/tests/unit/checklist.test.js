import { describe, it, expect } from "vitest";
import { VERSION, DATA } from "../../checklist.js";

describe("VERSION", () => {
    it("follows semantic versioning format (x.y.z)", () => {
        expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it("is a non-empty string", () => {
        expect(typeof VERSION).toBe("string");
        expect(VERSION.length).toBeGreaterThan(0);
    });
});

describe("DATA structure", () => {
    it("is a non-empty array", () => {
        expect(Array.isArray(DATA)).toBe(true);
        expect(DATA.length).toBeGreaterThan(0);
    });

    it("contains must, should, and may sections", () => {
        const levels = DATA.map((s) => s.level);
        expect(levels).toContain("must");
        expect(levels).toContain("should");
        expect(levels).toContain("may");
    });

    it("each section has required fields with correct types", () => {
        for (const section of DATA) {
            expect(typeof section.level).toBe("string");
            expect(typeof section.label).toBe("string");
            expect(Array.isArray(section.principles)).toBe(true);
            expect(section.principles.length).toBeGreaterThan(0);
        }
    });

    it("section levels are valid values", () => {
        const validLevels = new Set(["must", "should", "may"]);
        for (const section of DATA) {
            expect(validLevels.has(section.level)).toBe(true);
        }
    });

    it("each principle has required fields", () => {
        for (const section of DATA) {
            for (const principle of section.principles) {
                expect(typeof principle.code).toBe("string");
                expect(typeof principle.name).toBe("string");
                expect(typeof principle.desc).toBe("string");
                expect(Array.isArray(principle.items)).toBe(true);
                expect(principle.code.length).toBeGreaterThan(0);
                expect(principle.name.length).toBeGreaterThan(0);
                expect(principle.desc.length).toBeGreaterThan(0);
            }
        }
    });

    it("each principle has at least one item", () => {
        for (const section of DATA) {
            for (const principle of section.principles) {
                expect(principle.items.length).toBeGreaterThan(0);
            }
        }
    });

    it("all item texts are non-empty strings", () => {
        for (const section of DATA) {
            for (const principle of section.principles) {
                for (const item of principle.items) {
                    expect(typeof item).toBe("string");
                    expect(item.trim().length).toBeGreaterThan(0);
                }
            }
        }
    });

    it("principle codes are unique within each section", () => {
        for (const section of DATA) {
            const codes = section.principles.map((p) => p.code);
            const uniqueCodes = new Set(codes);
            expect(uniqueCodes.size).toBe(codes.length);
        }
    });

    it("must section label is MUST", () => {
        const mustSection = DATA.find((s) => s.level === "must");
        expect(mustSection.label).toBe("MUST");
    });

    it("should section label is SHOULD", () => {
        const shouldSection = DATA.find((s) => s.level === "should");
        expect(shouldSection.label).toBe("SHOULD");
    });

    it("may section label is MAY", () => {
        const maySection = DATA.find((s) => s.level === "may");
        expect(maySection.label).toBe("MAY");
    });
});

describe("DATA content", () => {
    it("must section includes expected STAMPED principles", () => {
        const mustSection = DATA.find((s) => s.level === "must");
        const codes = mustSection.principles.map((p) => p.code);
        expect(codes).toContain("S.1");
        expect(codes).toContain("A.1");
    });

    it("all principle descriptions end with a period", () => {
        for (const section of DATA) {
            for (const principle of section.principles) {
                expect(principle.desc.endsWith(".")).toBe(true);
            }
        }
    });
});
