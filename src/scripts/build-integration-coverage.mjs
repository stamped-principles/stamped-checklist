import { mkdir, readFile, readdir } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { convert } from "ast-v8-to-istanbul";
import istanbulCoverage from "istanbul-lib-coverage";
import istanbulReport from "istanbul-lib-report";
import istanbulReports from "istanbul-reports";
import { parseAstAsync } from "vite";

const { createCoverageMap } = istanbulCoverage;
const { createContext } = istanbulReport;
const reports = istanbulReports;

const ROOT_DIR = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const SOURCE_DIR = resolve(ROOT_DIR, "src");
const RAW_COVERAGE_DIR = resolve(ROOT_DIR, "coverage", "integration", "raw");
const OUTPUT_DIR = resolve(ROOT_DIR, "coverage", "integration");

const localhostPrefixes = ["http://localhost:5173/", "http://127.0.0.1:5173/"];

function resolveLocalSourcePath(scriptUrl) {
    if (!localhostPrefixes.some((prefix) => scriptUrl.startsWith(prefix))) return null;

    const pathname = decodeURIComponent(new URL(scriptUrl).pathname);
    const resolvedPath = resolve(SOURCE_DIR, "." + pathname);
    if (!resolvedPath.startsWith(SOURCE_DIR)) return null;
    if (extname(resolvedPath) !== ".js") return null;
    return resolvedPath;
}

const fileNames = await readdir(RAW_COVERAGE_DIR).catch(() => []);
const coverageMap = createCoverageMap({});

for (const fileName of fileNames) {
    const filePath = resolve(RAW_COVERAGE_DIR, fileName);
    const rawContent = await readFile(filePath, "utf-8");
    const entries = JSON.parse(rawContent);

    for (const entry of entries) {
        const sourcePath = resolveLocalSourcePath(entry.url);
        if (!sourcePath || typeof entry.source !== "string") continue;

        const converted = await convert({
            ast: await parseAstAsync(entry.source),
            code: entry.source,
            wrapperLength: 0,
            coverage: {
                url: pathToFileURL(sourcePath).href,
                functions: entry.functions,
            },
        });

        coverageMap.merge(converted);
    }
}

if (coverageMap.files().length === 0) {
    throw new Error(
        "No Playwright integration coverage data was collected. Ensure PW_COVERAGE=1 is set and integration tests completed successfully."
    );
}

await mkdir(OUTPUT_DIR, { recursive: true });
const context = createContext({ dir: OUTPUT_DIR, coverageMap });
reports.create("lcovonly", { file: "lcov.info" }).execute(context);
reports.create("text-summary").execute(context);
