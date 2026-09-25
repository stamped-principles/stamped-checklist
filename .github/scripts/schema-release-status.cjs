// Loaded only from the trusted base commit by pull_request_target.
module.exports = async ({ github, context }) => {
    const pr = context.payload.pull_request;
    const repo = context.repo;
    const status = {
        ...repo,
        sha: pr.head.sha,
        context: "Schema releases ready",
        target_url: `${context.serverUrl}/${repo.owner}/${repo.repo}/actions/runs/${context.runId}`,
    };
    // Fail closed if the API lookup or runner fails after this point.
    await github.rest.repos.createCommitStatus({
        ...status,
        state: "pending",
        description: "Checking schema preview configuration",
    });
    let preview = false;
    try {
        await github.rest.repos.getContent({
            owner: pr.head.repo.owner.login,
            repo: pr.head.repo.name,
            ref: pr.head.sha,
            path: "schema-preview.json",
        });
        // Presence blocks merging even if the file is empty or malformed.
        preview = true;
    } catch (error) {
        if (error.status !== 404) throw error;
    }
    await github.rest.repos.createCommitStatus({
        ...status,
        state: preview ? "pending" : "success",
        description: preview
            ? "Schema preview: replace PR pins with releases before merging"
            : "No unreleased schema preview configuration",
    });
    const labels = await github.paginate(github.rest.issues.listLabelsOnIssue, { ...repo, issue_number: pr.number });
    const labeled = labels.some((label) => label.name === "schema-preview");
    if (preview && !labeled) {
        await github.rest.issues.addLabels({ ...repo, issue_number: pr.number, labels: ["schema-preview"] });
    } else if (!preview && labeled) {
        await github.rest.issues.removeLabel({ ...repo, issue_number: pr.number, name: "schema-preview" });
    }
};
