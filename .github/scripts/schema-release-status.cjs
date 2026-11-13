// Loaded only from the trusted base commit by pull_request_target.
const { TextDecoder } = require("node:util");

module.exports = async ({ github, context }) => {
    const pr = context.payload.pull_request;
    const repo = context.repo;
    const status = {
        ...repo,
        sha: pr.head.sha,
        context: "Schema releases ready",
        target_url: `${context.serverUrl}/${repo.owner}/${repo.repo}/actions/runs/${context.runId}`,
    };
    // Overwrite any previous success before reading or resolving untrusted data.
    await github.rest.repos.createCommitStatus({
        ...status,
        state: "pending",
        description: "Checking every schema catalog source",
    });
    try {
        // This module is also from the trusted base checkout. Never import PR code.
        const { buildCatalog, resolveSource } = await import("../../src/scripts/schema-catalog.mjs");
        const { data } = await github.rest.repos.getContent({
            owner: pr.head.repo.owner.login,
            repo: pr.head.repo.name,
            ref: pr.head.sha,
            path: "src/checklist-releases.json",
        });
        if (data?.type !== "file" || data.encoding !== "base64" || typeof data.content !== "string") {
            throw new Error("Schema catalog must be a readable JSON file");
        }
        const catalog = JSON.parse(
            new TextDecoder("utf-8", { fatal: true }).decode(Buffer.from(data.content, "base64"))
        );
        const { hasPreviews } = await buildCatalog(catalog, (kind, pin) =>
            resolveSource(kind, pin, {
                getJSON: async (url) => (await github.request(`GET ${url}`)).data,
            })
        );
        await github.rest.repos.createCommitStatus({
            ...status,
            state: hasPreviews ? "pending" : "success",
            description: hasPreviews
                ? "Schema preview: replace every SHA pin with a release tag"
                : "Every schema catalog source is a verified release tag",
        });
    } catch (error) {
        // A missing catalog, invalid entry, or failed lookup must never pass the gate.
        await github.rest.repos.createCommitStatus({
            ...status,
            state: "error",
            description: "Schema catalog validation failed; inspect the workflow logs",
        });
        throw error;
    }
};
