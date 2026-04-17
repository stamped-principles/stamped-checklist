import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const SOURCE_PATH = path.join(repoRoot, "schema", "linkml.yaml");
const OUTPUT_PATH = path.join(repoRoot, "src", "checklist.linkml.schema.json");

function buildGeneratedSchema(linkml) {
    const requirementLevels = Object.keys(linkml?.enums?.RequirementLevel?.permissible_values || {});

    return {
        id: "https://stamped-principles.github.io/stamped-checklist/checklist.linkml.schema.json",
        name: "stamped_checklist",
        title: "STAMPED Checklist LinkML Schema",
        version: linkml?.version,
        prefixes: {
            linkml: linkml?.prefixes?.linkml || "https://w3id.org/linkml/",
            stamped: "https://stamped-principles.github.io/stamped-checklist/",
        },
        default_prefix: "stamped",
        default_range: "string",
        classes: {
            Checklist: {
                tree_root: true,
                attributes: {
                    version: {
                        required: true,
                        range: "string",
                    },
                    entries: {
                        required: true,
                        multivalued: true,
                        range: "ChecklistSection",
                    },
                },
            },
            ChecklistSection: {
                attributes: {
                    level: {
                        required: true,
                        range: "SectionLevel",
                    },
                    label: {
                        required: true,
                        range: "string",
                    },
                    principles: {
                        required: true,
                        multivalued: true,
                        range: "Principle",
                    },
                },
            },
            Principle: {
                attributes: {
                    code: {
                        required: true,
                        range: "string",
                    },
                    name: {
                        required: true,
                        range: "string",
                    },
                    desc: {
                        required: true,
                        range: "string",
                    },
                    items: {
                        required: true,
                        multivalued: true,
                        range: "string",
                    },
                },
            },
        },
        enums: {
            SectionLevel: {
                permissible_values: Object.fromEntries(requirementLevels.map((level) => [level, {}])),
            },
        },
    };
}

function readLinkmlYaml(sourcePath = SOURCE_PATH) {
    let yamlContent;
    try {
        yamlContent = fs.readFileSync(sourcePath, "utf8");
    } catch (error) {
        throw new Error(`Failed to read LinkML YAML at ${sourcePath}: ${error.message}`);
    }

    try {
        return YAML.parse(yamlContent);
    } catch (error) {
        throw new Error(`Failed to parse LinkML YAML at ${sourcePath}: ${error.message}`);
    }
}

function generateLinkmlSchema(sourcePath = SOURCE_PATH) {
    const linkml = readLinkmlYaml(sourcePath);
    return buildGeneratedSchema(linkml);
}

function writeGeneratedSchema(sourcePath = SOURCE_PATH, outputPath = OUTPUT_PATH) {
    const generated = generateLinkmlSchema(sourcePath);
    fs.writeFileSync(outputPath, `${JSON.stringify(generated, null, 4)}\n`, "utf8");
}

const executedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;

if (executedPath === __filename) {
    writeGeneratedSchema();
}

export { buildGeneratedSchema, generateLinkmlSchema, readLinkmlYaml, writeGeneratedSchema, SOURCE_PATH, OUTPUT_PATH };
