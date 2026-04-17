import { describe, it, expect } from "vitest";
import schema from "../../checklist.linkml.schema.json";
import checklistEntries from "../../checklist.data.json";
import { VERSION, DATA } from "../../checklist.js";
import { generateLinkmlSchema } from "../../../scripts/generate-linkml-schema.mjs";

function validateAttributeValue(value, range, schema, path) {
    if (schema.enums?.[range]) {
        const validValues = new Set(Object.keys(schema.enums[range].permissible_values || {}));
        if (!validValues.has(value)) {
            throw new Error(`${path} must be one of: ${Array.from(validValues).join(", ")}`);
        }
        return;
    }

    if (range === "string") {
        if (typeof value !== "string") {
            throw new Error(`${path} must be a string`);
        }
        return;
    }

    const targetClass = schema.classes?.[range];
    if (!targetClass) {
        throw new Error(`Unsupported range ${range} at ${path}`);
    }

    validateObjectInstance(value, targetClass, schema, path);
}

function validateObjectInstance(instance, classDef, schema, path) {
    if (!instance || typeof instance !== "object" || Array.isArray(instance)) {
        throw new Error(`${path} must be an object`);
    }

    const attributes = classDef.attributes || {};
    for (const [attrName, attrDef] of Object.entries(attributes)) {
        const hasValue = Object.prototype.hasOwnProperty.call(instance, attrName);
        if (attrDef.required && !hasValue) {
            throw new Error(`${path}.${attrName} is required`);
        }
        if (!hasValue) continue;

        const attrValue = instance[attrName];
        if (attrDef.multivalued) {
            if (!Array.isArray(attrValue)) {
                throw new Error(`${path}.${attrName} must be an array`);
            }
            attrValue.forEach((entry, index) => {
                validateAttributeValue(
                    entry,
                    attrDef.range || schema.default_range,
                    schema,
                    `${path}.${attrName}[${index}]`
                );
            });
        } else {
            validateAttributeValue(attrValue, attrDef.range || schema.default_range, schema, `${path}.${attrName}`);
        }
    }
}

describe("LinkML checklist schema", () => {
    it("matches the generated schema from schema/linkml.yaml", () => {
        expect(schema).toEqual(generateLinkmlSchema());
    });

    it("keeps checklist.js DATA sourced from checklist.data.json", () => {
        expect(DATA).toEqual(checklistEntries);
    });

    it("validates checklist payload against LinkML schema", () => {
        const payload = {
            version: VERSION,
            entries: checklistEntries,
        };

        const rootClassName = Object.entries(schema.classes).find(([, def]) => def.tree_root)?.[0];
        expect(rootClassName).toBe("Checklist");

        validateObjectInstance(payload, schema.classes[rootClassName], schema, rootClassName);
    });
});
