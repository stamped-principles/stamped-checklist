import { defineConfig } from "vitest/config";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    root: resolve(__dirname, ".."),
    test: {
        environment: "jsdom",
        globals: true,
        include: ["src/tests/unit/**/*.test.js"],
        coverage: {
            provider: "v8",
            reporter: ["text", "lcov"],
            include: ["src/**/*.js"],
            exclude: ["src/tests/**", "src/stories/**"],
        },
    },
});
