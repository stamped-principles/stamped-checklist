// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import publish from "../../.github/scripts/schema-release-status.cjs";

const SHAS = {
    checklist: "a".repeat(40),
    principles: "b".repeat(40),
    checklistPreview: "c".repeat(40),
    checklistNext: "d".repeat(40),
    principlesPreview: "e".repeat(40),
};
const releasedEntry = {
    id: "0.3.1",
    checklist: { tag: "v0.3.1" },
    principles: { tag: "v0.2.0" },
};
const releasedCatalog = { default: "0.3.1", entries: [releasedEntry] };
const previewEntry = {
    id: "review-name",
    checklist: { sha: SHAS.checklistPreview, pr: 15 },
    principles: { tag: "v0.2.0" },
};
const api = (kind) => `https://api.github.com/repos/stamped-principles/stamped-${kind}-schema`;
const file = (data) => ({
    type: "file",
    encoding: "base64",
    content: Buffer.from(JSON.stringify(data)).toString("base64"),
});

function setup({ catalog = releasedCatalog, raw, contentResponse, contentError, requestError, responses = {} } = {}) {
    const releases = {
        checklist: { "v0.3.1": SHAS.checklist, "v0.4.0": SHAS.checklistNext },
        principles: { "v0.2.0": SHAS.principles },
    };
    const files = {
        [SHAS.checklist]: { checklist_version: "0.3.1", principles_version: "0.2.0" },
        [SHAS.checklistNext]: { checklist_version: "0.4.0", principles_version: "0.2.0" },
        [SHAS.checklistPreview]: { checklist_version: "0.4.0", principles_version: "0.2.0" },
        [SHAS.principles]: { version: "0.2.0" },
        [SHAS.principlesPreview]: { version: "0.2.0" },
    };
    const github = {
        rest: {
            repos: {
                createCommitStatus: vi.fn().mockResolvedValue({}),
                getContent: contentError
                    ? vi.fn().mockRejectedValue(contentError)
                    : vi.fn().mockResolvedValue({
                          data:
                              contentResponse ??
                              (raw === undefined
                                  ? file(catalog)
                                  : { type: "file", encoding: "base64", content: Buffer.from(raw).toString("base64") }),
                      }),
            },
        },
        request: vi.fn(async (route) => {
            if (requestError) throw requestError;
            if (Object.hasOwn(responses, route)) {
                const response = responses[route];
                if (response instanceof Error) throw response;
                return { data: response };
            }
            const match = route.match(
                /^GET https:\/\/api\.github\.com\/repos\/stamped-principles\/stamped-(checklist|principles)-schema\/(.+)$/
            );
            if (!match) throw new Error(`Unexpected schema request: ${route}`);
            const [, kind, path] = match;
            if (path.startsWith("git/ref/tags/")) {
                const tag = path.slice("git/ref/tags/".length);
                const sha = releases[kind][tag];
                if (sha) return { data: { ref: `refs/tags/${tag}`, object: { type: "commit", sha } } };
            } else if (path === `pulls/${kind === "checklist" ? 15 : 12}/commits?per_page=100&page=1`) {
                return { data: [{ sha: SHAS[`${kind}Preview`] }] };
            } else if (path.startsWith(`contents/stamped-${kind}.json?ref=`)) {
                const data = files[path.split("?ref=")[1]];
                if (data) return { data: file(data) };
            }
            throw Object.assign(new Error(`Schema source not found: ${route}`), { status: 404 });
        }),
    };
    const context = {
        repo: { owner: "base", repo: "app" },
        serverUrl: "https://github.com",
        runId: 10,
        payload: {
            pull_request: {
                number: 139,
                head: {
                    sha: "f".repeat(40),
                    ref: "mutable-preview-branch",
                    repo: { owner: { login: "fork" }, name: "app" },
                },
            },
        },
    };
    return { github, context };
}

const statusStates = ({ github }) => github.rest.repos.createCommitStatus.mock.calls.map(([status]) => status.state);
const sourceRequests = ({ github }) => github.request.mock.calls.map(([route]) => route);

async function expectBlocked(args) {
    await expect(publish(args)).rejects.toBeDefined();
    expect(statusStates(args)).toEqual(["pending", "error"]);
    expect(args.github.rest.repos.createCommitStatus).toHaveBeenLastCalledWith(
        expect.objectContaining({ sha: args.context.payload.pull_request.head.sha, context: "Schema releases ready" })
    );
}

describe("schema release merge status", () => {
    it("sets pending first, reads catalog data at the exact PR head, and verifies every release", async () => {
        const args = setup();
        await publish(args);
        expect(args.github.rest.repos.getContent).toHaveBeenCalledExactlyOnceWith({
            owner: "fork",
            repo: "app",
            ref: "f".repeat(40),
            path: "src/checklist-releases.json",
        });
        expect(statusStates(args)).toEqual(["pending", "success"]);
        expect(args.github.rest.repos.createCommitStatus.mock.invocationCallOrder[0]).toBeLessThan(
            args.github.rest.repos.getContent.mock.invocationCallOrder[0]
        );
        expect(sourceRequests(args)).toEqual([
            `GET ${api("checklist")}/git/ref/tags/v0.3.1`,
            `GET ${api("checklist")}/contents/stamped-checklist.json?ref=${SHAS.checklist}`,
            `GET ${api("principles")}/git/ref/tags/v0.2.0`,
            `GET ${api("principles")}/contents/stamped-principles.json?ref=${SHAS.principles}`,
        ]);
        expect(args.github.rest.repos.createCommitStatus).toHaveBeenLastCalledWith(
            expect.objectContaining({
                owner: "base",
                repo: "app",
                sha: "f".repeat(40),
                state: "success",
                context: "Schema releases ready",
                target_url: "https://github.com/base/app/actions/runs/10",
            })
        );
    });

    it.each([
        previewEntry,
        { ...previewEntry, checklist: releasedEntry.checklist, principles: { sha: SHAS.principlesPreview, pr: 12 } },
        { ...previewEntry, principles: { sha: SHAS.principlesPreview, pr: 12 } },
    ])("blocks when either schema source uses a SHA: %j", async (entry) => {
        const args = setup({ catalog: { default: entry.id, entries: [entry] } });
        await publish(args);
        expect(statusStates(args)).toEqual(["pending", "pending"]);
        expect(args.github.rest.repos.createCommitStatus).toHaveBeenLastCalledWith(
            expect.objectContaining({ description: expect.stringContaining("replace every SHA pin") })
        );
    });

    it("blocks a nondefault preview in a catalog containing several entries", async () => {
        const args = setup({ catalog: { default: releasedEntry.id, entries: [releasedEntry, previewEntry] } });
        await publish(args);
        expect(statusStates(args)).toEqual(["pending", "pending"]);
        expect(sourceRequests(args)).toContain(
            `GET ${api("checklist")}/contents/stamped-checklist.json?ref=${SHAS.checklistPreview}`
        );
        expect(sourceRequests(args)).toContain(`GET ${api("checklist")}/git/ref/tags/v0.3.1`);
    });

    it("allows several compatible released entries only after resolving all of them", async () => {
        const nextEntry = { ...releasedEntry, id: "0.4.0", checklist: { tag: "v0.4.0" } };
        const args = setup({ catalog: { default: releasedEntry.id, entries: [releasedEntry, nextEntry] } });
        await publish(args);
        expect(statusStates(args)).toEqual(["pending", "success"]);
        expect(sourceRequests(args)).toContain(`GET ${api("checklist")}/git/ref/tags/v0.4.0`);
        expect(sourceRequests(args)).toContain(
            `GET ${api("checklist")}/contents/stamped-checklist.json?ref=${SHAS.checklistNext}`
        );
    });

    it("does not stop validation after finding a preview entry", async () => {
        const invalidEntry = { ...releasedEntry, id: "0.9.0", checklist: { tag: "v0.9.0" } };
        const args = setup({ catalog: { default: previewEntry.id, entries: [previewEntry, invalidEntry] } });
        await expectBlocked(args);
        expect(sourceRequests(args)).toContain(`GET ${api("checklist")}/git/ref/tags/v0.9.0`);
    });

    it.each([
        null,
        {},
        { defaultVersion: "0.3.1", releases: [{ version: "0.3.1" }] },
        { default: "missing", entries: [releasedEntry] },
        { default: "0.3.1", entries: [releasedEntry, releasedEntry] },
        { default: "0.3.1", entries: [{ id: "0.3.1", checklist: { tag: "v0.3.1" } }] },
        { default: "0.3.1", entries: [{ ...releasedEntry, checklist: { tag: "v0.3.1", repo: "attacker/schema" } }] },
        { default: "0.3.1", entries: [{ ...releasedEntry, checklist: { tag: "https://attacker.example/schema" } }] },
        {
            default: "0.3.1",
            entries: [{ ...releasedEntry, checklist: { tag: "v0.3.1", sha: SHAS.checklistPreview, pr: 15 } }],
        },
        { default: "0.3.1", entries: [{ ...releasedEntry, checklist: { sha: "main", pr: 15 } }] },
        { ...releasedCatalog, script: "throw new Error('PR code must never execute')" },
    ])("rejects invalid catalog data before resolving sources: %j", async (catalog) => {
        const args = setup({ catalog });
        await expectBlocked(args);
        expect(args.github.request).not.toHaveBeenCalled();
    });

    it.each(["", "{broken", "module.exports = () => { throw new Error('never execute'); }"])(
        "rejects malformed or executable catalog content: %j",
        async (raw) => {
            const args = setup({ raw });
            await expectBlocked(args);
            expect(args.github.request).not.toHaveBeenCalled();
        }
    );

    it.each([
        [],
        { type: "dir", encoding: "base64", content: "" },
        { type: "file", encoding: "none", content: "" },
        { type: "file", encoding: "base64", content: Buffer.from([0xff]).toString("base64") },
    ])("rejects unreadable catalog content responses: %j", async (contentResponse) => {
        const args = setup({ contentResponse });
        await expectBlocked(args);
        expect(args.github.request).not.toHaveBeenCalled();
    });

    it.each([404, 403, 500])("fails closed when the catalog lookup returns %s", async (status) => {
        const error = Object.assign(new Error("Catalog lookup failed"), { status });
        const args = setup({ contentError: error });
        await expectBlocked(args);
        expect(args.github.request).not.toHaveBeenCalled();
    });

    it("fails closed on source API failures", async () => {
        const args = setup({ requestError: Object.assign(new Error("API unavailable"), { status: 503 }) });
        await expectBlocked(args);
    });

    it.each([
        { ref: "refs/heads/v0.3.1", object: { type: "commit", sha: SHAS.checklist } },
        { ref: "refs/tags/different-tag", object: { type: "commit", sha: SHAS.checklist } },
        { ref: "refs/tags/v0.3.1", object: { type: "tree", sha: SHAS.checklist } },
        { ref: "refs/tags/v0.3.1", object: { type: "commit", sha: "main" } },
    ])("requires an actual release tag resolving to an immutable commit: %j", async (ref) => {
        const args = setup({ responses: { [`GET ${api("checklist")}/git/ref/tags/v0.3.1`]: ref } });
        await expectBlocked(args);
    });

    it("dereferences annotated tags and fetches schema data at their immutable commit", async () => {
        const tagSha = "1".repeat(40);
        const args = setup({
            responses: {
                [`GET ${api("checklist")}/git/ref/tags/v0.3.1`]: {
                    ref: "refs/tags/v0.3.1",
                    object: { type: "tag", sha: tagSha },
                },
                [`GET ${api("checklist")}/git/tags/${tagSha}`]: {
                    object: { type: "commit", sha: SHAS.checklist },
                },
            },
        });
        await publish(args);
        expect(statusStates(args)).toEqual(["pending", "success"]);
        expect(sourceRequests(args)).toContain(`GET ${api("checklist")}/git/tags/${tagSha}`);
        expect(sourceRequests(args)).toContain(
            `GET ${api("checklist")}/contents/stamped-checklist.json?ref=${SHAS.checklist}`
        );
    });

    it("fails closed on cyclic or excessive tag indirection", async () => {
        const tagSha = "1".repeat(40);
        const args = setup({
            responses: {
                [`GET ${api("checklist")}/git/ref/tags/v0.3.1`]: {
                    ref: "refs/tags/v0.3.1",
                    object: { type: "tag", sha: tagSha },
                },
                [`GET ${api("checklist")}/git/tags/${tagSha}`]: {
                    object: { type: "tag", sha: tagSha },
                },
            },
        });
        await expectBlocked(args);
        expect(args.github.request.mock.calls.length).toBeLessThan(40);
    });

    it("requires a preview pin to belong to its stated upstream PR", async () => {
        const args = setup({
            catalog: { default: previewEntry.id, entries: [previewEntry] },
            responses: { [`GET ${api("checklist")}/pulls/15/commits?per_page=100&page=1`]: [] },
        });
        await expectBlocked(args);
    });

    it("rejects incompatible checklist and principles versions", async () => {
        const args = setup({
            responses: {
                [`GET ${api("principles")}/contents/stamped-principles.json?ref=${SHAS.principles}`]: file({
                    version: "0.9.0",
                }),
            },
        });
        await expectBlocked(args);
    });

    it("rejects malformed upstream schema data", async () => {
        const args = setup({
            responses: {
                [`GET ${api("checklist")}/contents/stamped-checklist.json?ref=${SHAS.checklist}`]: {
                    type: "file",
                    encoding: "base64",
                    content: Buffer.from("{broken").toString("base64"),
                },
            },
        });
        await expectBlocked(args);
    });

    it("does not read PR data if the initial pending status cannot be published", async () => {
        const args = setup();
        args.github.rest.repos.createCommitStatus.mockRejectedValueOnce(new Error("Status API down"));
        await expect(publish(args)).rejects.toThrow("Status API down");
        expect(statusStates(args)).toEqual(["pending"]);
        expect(args.github.rest.repos.getContent).not.toHaveBeenCalled();
        expect(args.github.request).not.toHaveBeenCalled();
    });

    it("keeps pending if even publishing the error status fails", async () => {
        const args = setup({ contentError: new Error("Read failed") });
        args.github.rest.repos.createCommitStatus
            .mockResolvedValueOnce({})
            .mockRejectedValueOnce(new Error("API down"));
        await expect(publish(args)).rejects.toThrow("API down");
        expect(statusStates(args)).toEqual(["pending", "error"]);
        expect(statusStates(args)).not.toContain("success");
    });
});

describe("schema release workflow trust boundary", () => {
    it("executes only base-commit code with minimal permissions and no label events", () => {
        const workflow = readFileSync(
            new URL("../../.github/workflows/schema-release-status.yml", import.meta.url),
            "utf8"
        );
        expect(workflow).toContain("pull_request_target:");
        expect(workflow).toContain("ref: ${{ github.event.pull_request.base.sha }}");
        expect(workflow).toContain("persist-credentials: false");
        expect(workflow).toContain("contents: read");
        expect(workflow).toContain("statuses: write");
        expect(workflow).toContain("require('./.github/scripts/schema-release-status.cjs')");
        expect(workflow).not.toMatch(/github\.event\.pull_request\.head|refs\/pull|\b(?:un)?labeled\b/);
        expect(workflow).not.toMatch(/(?:issues|pull-requests):\s*write|npm\s|yarn\s|pnpm\s/);
    });
});
