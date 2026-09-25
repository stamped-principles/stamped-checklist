import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { previewSources, previewBundle } from "./schema-preview.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, "..", "data");
const JSON_INDENT = 4;

import releases from "../checklist-releases.json" with { type: "json" };

function schemaRawUrl(repo, tag, path) {
    return `https://raw.githubusercontent.com/${repo}/${tag}/${path}`;
}

async function downloadJSON(url) {
    const response = await fetch(url);
    if (!response.ok) {
        let hint = "Check network connectivity and URL accessibility.";
        if (response.status === 404) hint = "Check that the upstream repository, pinned tag, and file path exist.";
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

const archive = {};
for (const release of releases.releases) {
    if (Object.hasOwn(archive, release.version)) throw new Error(`Duplicate release: ${release.version}`);
    const checklist = await downloadJSON(
        schemaRawUrl("stamped-principles/stamped-checklist-schema", release.checklistTag, "stamped-checklist.json")
    );
    const principles = await downloadJSON(
        schemaRawUrl("stamped-principles/stamped-principles-schema", release.principlesTag, "stamped-principles.json")
    );
    if ((checklist.checklist_version ?? checklist.version) !== release.version) {
        throw new Error(`Checklist version does not match release ${release.version}`);
    }
    if (checklist.principles_version !== principles.version) {
        throw new Error(`Principles version does not match checklist ${release.version}`);
    }
    archive[release.version] = { checklist, principles };
    console.log(`Bundled checklist ${release.version} with principles ${principles.version}`);
}
let current = archive[releases.defaultVersion];
let preview;
try {
    preview = JSON.parse(await readFile(resolve(__dirname, "../../schema-preview.json"), "utf-8"));
} catch (error) {
    if (error.code !== "ENOENT") throw error;
}
if (preview !== undefined) {
    const sources = previewSources(preview);
    current = previewBundle(
        preview,
        await downloadJSON(sources.checklist.dataUrl),
        await downloadJSON(sources.principles.dataUrl)
    );
    archive[current.checklist._preview.id] = current;
    console.log(
        `Bundled schema preview from checklist PR #${sources.checklist.pr} and principles PR #${sources.principles.pr}`
    );
}
if (!current) throw new Error("Default checklist version is not in the release registry");
for (const [name, data] of Object.entries({
    "stamped-checklist.json": current.checklist,
    "stamped-principles.json": current.principles,
    "checklist-versions.json": archive,
})) {
    await writeFile(resolve(DATA_DIR, name), `${JSON.stringify(data, null, JSON_INDENT)}\n`, "utf-8");
}
