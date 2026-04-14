#!/usr/bin/env node
/**
 * Generates src/data.js from src/checklist.json.
 *
 * Run with: npm run build
 */

const fs = require("fs");
const path = require("path");

const jsonPath = path.join(__dirname, "..", "src", "checklist.json");
const outPath = path.join(__dirname, "..", "src", "data.js");

let data;
try {
    data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
} catch (e) {
    console.error(`Failed to parse ${jsonPath}: ${e.message}`);
    process.exit(1);
}

const output = `// AUTO-GENERATED — edit src/checklist.json and run \`npm run build\` to update.\nconst DATA = ${JSON.stringify(
    data,
    null,
    4
)};\n`;

try {
    fs.writeFileSync(outPath, output, "utf8");
} catch (e) {
    console.error(`Failed to write ${outPath}: ${e.message}`);
    process.exit(1);
}

console.log(`Generated ${outPath}`);
