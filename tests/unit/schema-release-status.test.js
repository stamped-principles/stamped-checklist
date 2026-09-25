import { describe, expect, it, vi } from "vitest";
import publish from "../../.github/scripts/schema-release-status.cjs";

function setup({ present = true, labeled = false, error } = {}) {
    const github = {
        rest: {
            repos: {
                createCommitStatus: vi.fn().mockResolvedValue({}),
                getContent: error
                    ? vi.fn().mockRejectedValue(error)
                    : present
                      ? vi.fn().mockResolvedValue({ data: { content: "malformed" } })
                      : vi.fn().mockRejectedValue({ status: 404 }),
            },
            issues: { listLabelsOnIssue: vi.fn(), addLabels: vi.fn(), removeLabel: vi.fn() },
        },
        paginate: vi.fn().mockResolvedValue(labeled ? [{ name: "schema-preview" }] : []),
    };
    const context = {
        repo: { owner: "base", repo: "app" },
        serverUrl: "https://github.com",
        runId: 10,
        payload: {
            pull_request: { number: 139, head: { sha: "head-sha", repo: { owner: { login: "fork" }, name: "app" } } },
        },
    };
    return { github, context };
}

describe("schema release merge status", () => {
    it("blocks on file presence without parsing or executing PR content", async () => {
        const args = setup();
        await publish(args);
        expect(args.github.rest.repos.getContent).toHaveBeenCalledWith({
            owner: "fork",
            repo: "app",
            ref: "head-sha",
            path: "schema-preview.json",
        });
        expect(args.github.rest.repos.createCommitStatus).toHaveBeenLastCalledWith(
            expect.objectContaining({ sha: "head-sha", state: "pending", context: "Schema releases ready" })
        );
        expect(args.github.rest.issues.addLabels).toHaveBeenCalled();
    });
    it("passes and removes the label once preview configuration is removed", async () => {
        const args = setup({ present: false, labeled: true });
        await publish(args);
        expect(args.github.rest.repos.createCommitStatus).toHaveBeenLastCalledWith(
            expect.objectContaining({ state: "success" })
        );
        expect(args.github.rest.issues.removeLabel).toHaveBeenCalled();
    });
    it("does not rely on labels for the merge decision", async () => {
        const args = setup({ present: true, labeled: true });
        await publish(args);
        expect(args.github.rest.repos.createCommitStatus).toHaveBeenLastCalledWith(
            expect.objectContaining({ state: "pending" })
        );
        expect(args.github.rest.issues.addLabels).not.toHaveBeenCalled();
    });
    it("leaves the gate pending on API errors instead of allowing a merge", async () => {
        const args = setup({ error: { status: 403 } });
        await expect(publish(args)).rejects.toEqual({ status: 403 });
        expect(args.github.rest.repos.createCommitStatus).toHaveBeenCalledTimes(1);
        expect(args.github.rest.repos.createCommitStatus).toHaveBeenLastCalledWith(
            expect.objectContaining({ state: "pending" })
        );
    });
});
