import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, "..", "data");

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
        throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
    }
    return response.json();
}

await mkdir(DATA_DIR, { recursive: true });

for (const schema of SCHEMAS) {
    const json = await downloadJSON(schema.url);
    await writeFile(schema.output, `${JSON.stringify(json, null, 4)}\n`, "utf-8");
    console.log(`Synced ${schema.output}`);
}
