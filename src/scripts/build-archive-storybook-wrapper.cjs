#!/usr/bin/env node
"use strict";

/**
 * Wrapper for build-archive-storybook that restores npm-intercepted CLI args.
 *
 * When `npm exec build-archive-storybook --output-dir=X --stats-json=X` is run,
 * npm intercepts --output-dir and --stats-json as npm config flags (storing them
 * as npm_config_* environment variables) instead of passing them to the binary.
 * This wrapper reads those env vars and re-introduces them as proper CLI args
 * before delegating to the real build-archive-storybook binary.
 */

const { spawnSync } = require("child_process");
const path = require("path");

const args = process.argv.slice(2);

if (process.env.npm_config_output_dir && !args.some((a) => a.startsWith("--output-dir"))) {
    args.push("--output-dir=" + process.env.npm_config_output_dir);
}
if (process.env.npm_config_stats_json && !args.some((a) => a.startsWith("--stats-json"))) {
    args.push("--stats-json=" + process.env.npm_config_stats_json);
}

// Use __dirname (the real path of this file after following symlinks) to compute
// the project root rather than require.resolve, because require.resolve needs the
// package to already be installed in the calling module's node_modules search path,
// which can fail in development environments where @chromatic-com/playwright is not
// yet installed. __dirname is always available and correctly points to src/scripts/.
const projectRoot = path.resolve(__dirname, "..", "..");
const realBin = path.join(
    projectRoot,
    "node_modules",
    "@chromatic-com",
    "playwright",
    "dist",
    "bin",
    "build-archive-storybook.js"
);

const result = spawnSync(process.execPath, [realBin, ...args], { stdio: "inherit" });
process.exit(result.status ?? (result.error ? 1 : 0));
