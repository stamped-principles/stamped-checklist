# Development

For installing, running, and building the app locally, see [`src/README.md`](../src/README.md).

## Schema previews

A schema preview bundles an unreleased checklist or principles schema from an open pull request in [stamped-checklist-schema](https://github.com/stamped-principles/stamped-checklist-schema) or [stamped-principles-schema](https://github.com/stamped-principles/stamped-principles-schema), so it can be reviewed in the app before it is released.

### Adding a preview

Previews are entries in `src/checklist-releases.json`, listed alongside the released versions with the newest at the top. Each side of an entry is either a release `tag` or a pull request commit pinned with `sha` and `pr`:

```json
{
    "id": "pr-20",
    "checklist": { "sha": "2695dcaf0fb12e1fdc2cf865bf0ac0cf4e0f6060", "pr": 20 },
    "principles": { "tag": "v0.3.0" }
}
```

-   `sha` must be a full, lowercase commit SHA from pull request `pr` in that schema repository. It does not have to be the latest commit; update it to pick up new changes.
-   `id` labels the preview, shown as `Schema preview: <id> (<version>)` in the version indicator and dropdown. Released entries must instead use the checklist version as their `id`.
-   The checklist's `principles_version` must match the principles schema's `version`. If the checklist change needs unreleased principles, pin both sides to their pull requests.
-   Set `default` to the preview's `id` to open it on plain visits and after Reset. While it is the default, the version indicator test in `tests/integration/app.test.js` must expect the preview label instead of `Checklist v...`.

`npm run sync:schemas` runs before every build and test run. It validates the catalog, checks that each pinned commit belongs to its pull request, and downloads every entry. Set `GITHUB_TOKEN` or `GH_TOKEN` if it hits the GitHub API rate limit.

### Reviewing a preview

The Preview workflow deploys each pull request's build and links it from the pull request, so reviewers can try the preview without building locally. The page shows an "Unreleased schema preview" notice that links to each pinned source.

Preview answers are saved separately from released checklists, under an identity built from both pinned commits (`<version>-preview.<checklist SHA>.<principles SHA>`). Changing a pin therefore starts a new assessment. While a preview is the default, links to an older pin open the current preview unanswered, with a "Preview updated" notice.

### Merge gate

The "Schema releases ready" status check (`.github/workflows/schema-release-status.yml`) keeps unreleased schemas out of `main`. On each pull request into `main`, it validates that pull request's catalog using the scripts from `main` and reports:

-   **pending** while any entry pins a pull request commit,
-   **success** once every source is a release tag,
-   **error** if the catalog is invalid or a source cannot be resolved.

The workflow runs from `main`, so it reports only once it has been merged. It blocks merging only after "Schema releases ready" is marked as a required status check for `main` in the repository settings.

### Releasing a previewed schema

Once the schema pull request is merged and tagged:

1. Replace the entry's `sha` and `pr` with the release `tag`.
2. Rename the entry's `id` to the checklist version, such as `0.4.0`, and update `default` to match.
3. Restore the version indicator test in `tests/integration/app.test.js` to expect `Checklist v...`.
4. Bump the version in `package.json` and add a changelog entry, as for any change under `src/`.
