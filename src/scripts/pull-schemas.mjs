import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildCatalog } from "./schema-catalog.mjs";
import catalog from "../checklist-releases.json" with { type: "json" };

const DATA_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..", "data");
const { archive, current } = await buildCatalog(catalog);
await mkdir(DATA_DIR, { recursive: true });
for (const [name, data] of Object.entries({
    "stamped-checklist.json": current.checklist,
    "stamped-principles.json": current.principles,
    "checklist-versions.json": archive,
})) {
    await writeFile(resolve(DATA_DIR, name), `${JSON.stringify(data, null, 4)}\n`, "utf-8");
}
console.log(`Bundled ${Object.keys(archive).length} configured schema pairs (default: ${catalog.default})`);
