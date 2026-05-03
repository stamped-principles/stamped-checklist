#!/usr/bin/env node
'use strict';

/**
 * Wrapper for build-archive-storybook that restores npm-intercepted CLI args.
 *
 * When `npm exec build-archive-storybook --output-dir=X --stats-json=X` is run,
 * npm intercepts --output-dir and --stats-json as npm config flags (storing them
 * as npm_config_* environment variables) instead of passing them to the binary.
 * This wrapper reads those env vars and re-introduces them as proper CLI args
 * before delegating to the real build-archive-storybook binary.
 */

const { spawnSync } = require('child_process');
const path = require('path');

const args = process.argv.slice(2);

if (process.env.npm_config_output_dir && !args.some((a) => a.startsWith('--output-dir'))) {
    args.push('--output-dir=' + process.env.npm_config_output_dir);
}
if (process.env.npm_config_stats_json && !args.some((a) => a.startsWith('--stats-json'))) {
    args.push('--stats-json=' + process.env.npm_config_stats_json);
}

const pkgDir = path.dirname(require.resolve('@chromatic-com/playwright/package.json'));
const realBin = path.join(pkgDir, 'dist/bin/build-archive-storybook.js');

const result = spawnSync(process.execPath, [realBin, ...args], { stdio: 'inherit' });
process.exit(result.status ?? 0);
