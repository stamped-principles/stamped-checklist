# Previewing schema PRs

Schema previews let reviewers exercise both unmerged schema PRs in the app.
They use the normal local development, test, and PR deployment commands.
The app PR remains reviewable while a separate required commit status blocks merging.

## One-time repository configuration

1. Merge the preview tooling PR first, without a `schema-preview.json` file.
   The trusted gate workflow must exist on the target branch before it can govern other PRs.
2. Create a repository label named `schema-preview` (suggested description: “Reviewable preview; waiting for schema releases”).
   The workflow adds or removes it based on configuration, including restoring it if someone removes it manually.
3. Open or update a PR targeting `main` to run **Schema release gate**.
   Under **Settings → Rules → Rulesets → require-pr**, add **Schema releases ready** to the required status checks for `main`.
   Select GitHub Actions as the expected source when available.
   Keep the existing required checks and restrict bypass permissions as appropriate.
4. Verify on a disposable preview PR that the preview deploys, tests pass, and **Schema releases ready** stays pending with merging blocked.
   Remove its preview file and verify the status succeeds.

Require the **Schema releases ready** commit status, not the workflow job **publish-status**.
The job completes successfully after publishing a pending status; it does not wait or deliberately fail tests.
Until the ruleset is configured, the label and status are informational and do not enforce a merge block.
GitHub documents [required status checks](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches#require-status-checks-before-merging) and [commit statuses](https://docs.github.com/en/rest/commits/statuses).

The gate runs on `pull_request_target`, checks out only the trusted base commit, and reads the head's configuration through the GitHub API.
It never executes PR code or installs PR dependencies.
Its token needs contents read, commit statuses write, and issue/PR label write permissions. Normal build/test/deployment workflows keep their existing permissions; fork preview deployments retain the existing repository restrictions.

## Start a preview

Create `schema-preview.json` at the app repository root and commit it on the app PR branch:

```json
{
    "checklist": {
        "pr": 15,
        "sha": "REPLACE_WITH_FULL_40_CHARACTER_COMMIT_SHA"
    },
    "principles": {
        "pr": 12,
        "sha": "REPLACE_WITH_FULL_40_CHARACTER_COMMIT_SHA"
    }
}
```

Use actual PR numbers and full lowercase head commit SHAs from the two upstream schema repositories.
For example:

```sh
gh pr view 15 --repo stamped-principles/stamped-checklist-schema --json headRefOid --jq .headRefOid
gh pr view 12 --repo stamped-principles/stamped-principles-schema --json headRefOid --jq .headRefOid
npm run dev
```

Both pins are required, and the checklist's `principles_version` must match the principles JSON's `version`.
The JSON files must already exist in those commits.
Pins are explicit: upstream pushes never silently change an existing app preview.
Update the SHA and commit the app configuration to review a new revision.
The PR numbers provide source links; downloads use the SHAs.

The preview becomes the default selection alongside all published checklist versions.
A visible banner links both schema PRs and shows their short SHAs.
Its URL and browser-save identity includes both full SHAs, keeping preview answers separate from released assessments and other preview revisions.
Preview links are only usable in builds containing those pins.
Automatic answer translation requires both source and target bundles to be available, so links from removed preview revisions cannot be migrated in a new build.
Keep the old preview configuration if those assessments need to be reopened.

The same configuration is used by `npm test`, `npm run test:e2e`, and `npm run build`.
Presence of the file keeps the merge status pending even if its JSON is invalid; genuine build or test errors still fail normally.

## Finish after the releases

1. Add the published schema tag pair to `src/checklist-releases.json` and update `defaultVersion` as needed.
2. Delete `schema-preview.json` and commit both changes together.
3. Run tests and review the release preview.
   The workflow removes the label and marks **Schema releases ready** successful.

Do not bypass the gate or just remove the label.
A label does not determine merge readiness.
No repository settings are changed by installing this code; a maintainer must perform the one-time setup above.
