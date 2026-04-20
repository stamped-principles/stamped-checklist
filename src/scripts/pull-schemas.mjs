import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, "..", "data");
const JSON_INDENT = 4;

const SCHEMAS = [
    {
        url: "https://raw.githubusercontent.com/stamped-principles/stamped-checklist-schema/main/stamped-checklist.json",
        output: resolve(DATA_DIR, "stamped-checklist.json"),
    },
    {
        url: "https://raw.githubusercontent.com/stamped-principles/stamped-principles-schema/main/stamped-principles.json",
        output: resolve(DATA_DIR, "stamped-principles.json"),
    },
];

async function downloadJSON(url) {
    const response = await fetch(url);
    if (!response.ok) {
        let hint = "Check network connectivity and URL accessibility.";
        if (response.status === 404) hint = "Check that the upstream repository and file path exist.";
        if (response.status === 403) hint = "Check access policy for raw.githubusercontent.com in your environment.";
        throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}. ${hint}`);
    }
    try {
        return await response.json();
    } catch (error) {
        throw new Error(`Failed to parse JSON from ${url}: ${error instanceof Error ? error.message : String(error)}`);
    }
}

await mkdir(DATA_DIR, { recursive: true });

for (const schema of SCHEMAS) {
    const json = await downloadJSON(schema.url);
    try {
        await writeFile(schema.output, `${JSON.stringify(json, null, JSON_INDENT)}\n`, "utf-8");
    } catch (error) {
        throw new Error(
            `Failed to write schema data from ${schema.url} to ${schema.output}: ${
                error instanceof Error ? error.message : String(error)
            }`
        );
    }
    console.log(`Synced ${schema.output}`);
}
