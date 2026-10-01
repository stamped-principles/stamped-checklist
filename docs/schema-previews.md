# Schema catalog and previews

`src/checklist-releases.json` is the single catalog for released assessments and
unreleased schema previews. Local development, tests, builds, and PR deployments
use the same explicitly configured checklist/principles pairs. Nothing discovers
new releases, pairs schema versions automatically, or follows an upstream PR head.

## Configure the catalog

The catalog has an explicit `default` entry ID and an `entries` array:

```json
{
    "default": "0.3.1",
    "entries": [
        {
            "id": "0.3.1",
            "checklist": { "tag": "v0.3.1" },
            "principles": { "tag": "v0.2.0" }
        },
        {
            "id": "review-name",
            "checklist": {
                "sha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                "pr": 15
            },
            "principles": { "tag": "v0.2.0" }
        }
    ]
}
```

The SHA above is illustrative; replace it with an actual full lowercase commit SHA
from the checklist schema PR. Preserve existing released entries when adding a
pair so old assessments remain available. There is no separate preview file.

Each entry names one source from each of the two upstream repositories:

-   Checklist: <https://github.com/stamped-principles/stamped-checklist-schema>
-   Principles: <https://github.com/stamped-principles/stamped-principles-schema>

A source is either `{ "tag": "release-tag" }` or
`{ "sha": "full-40-character-lowercase-sha", "pr": 15 }`. Do not combine the two
forms in one source. The PR number must be positive, and the pinned commit must
belong to that PR. Obtain a current head SHA, for example, with:

```sh
gh pr view 15 --repo stamped-principles/stamped-checklist-schema --json headRefOid --jq .headRefOid
```

Tags must be verified Git release tags in the corresponding upstream repository;
a branch name does not qualify. A separate GitHub Release object is not required.
A tag is resolved to its commit before its JSON is read, so the resolved commit
also identifies a tag-sourced half of a preview. Both schema JSON files must exist at their resolved
commits, and the checklist's `principles_version` must match the principles JSON's
`version`.

An entry containing either SHA source is a preview. Mixed tag/SHA pairs, two-SHA
pairs, and multiple preview entries are supported. An entry with two tag sources
is released, and its `id` must match the checklist JSON's declared version. IDs are
unique catalog keys; a preview can use a friendly name such as `review-name`.
`default` must reference one of those IDs and may select a release or a preview.
To open the preview on plain visits, set `default` to `review-name` in this example.

Pins are explicit: upstream pushes never silently change an existing app preview.
Update the SHA in the catalog and commit that change to review a new revision.
Only configured pairs appear in the app; available upstream releases are not
implicitly added.

## Review a preview

Run the usual commands from the app repository root:

```sh
npm run dev
npm test
npm run test:e2e
npm run build
```

The dropdown offers every configured release and preview. A preview's friendly
catalog ID appears in its display label, and its banner links both sources,
showing their release tags or PR numbers and short resolved SHAs.

The preview's URL and browser-save identity is
`<checklist-version>-preview.<resolved-checklist-sha>.<resolved-principles-sha>`.
Both full SHAs are included even when one source uses a release tag. The friendly
catalog ID is not the assessment identity. Answers stay separate from released
assessments and other preview revisions.

The stable app PR preview URL serves the latest deployment and configured pairs.
Answers for any preview still in the catalog restore normally, including a
nondefault preview. If a URL refers to removed preview pins and the default is a
preview, that default opens unanswered with a brief notice. It does not load
historical schemas, retain old deployments, or migrate stale draft answers. With
a released default, unavailable preview links follow the existing unavailable
assessment handling. Released-assessment URL behavior is unchanged.

## Merge gate

The **Schema release gate** workflow publishes the **Schema releases ready** commit
status for the exact app PR head. It runs on `pull_request_target`, checks out only
the trusted base commit, and reads `src/checklist-releases.json` at the exact PR
head through the GitHub API. It never executes PR code or installs PR dependencies.

The trusted code validates every catalog entry, including entries that are not the
default, and resolves and checks every configured schema pair:

-   A valid catalog with any SHA-based preview stays **pending**, even if its default
    is a released entry
-   A valid catalog containing only verified release-tag pairs is **successful**
-   Missing or invalid catalog data, unavailable release tags, bad pins,
    incompatible versions, and fetch or validation errors fail closed rather than
    marking the head ready

The workflow uses only `contents: read` and `statuses: write`. It does not add,
remove, or depend on labels. Normal build, test, and deployment workflows retain
their existing permissions and fork restrictions. Genuine build and test errors
still fail normally; the release gate does not deliberately fail those checks.

## One-time repository configuration

1. Merge the catalog tooling first with an all-release catalog. The trusted gate
   code must exist on the target branch before it can govern other PRs.
2. Open or update a PR targeting `main` to run **Schema release gate**. Under
   **Settings → Rules → Rulesets → require-pr**, add **Schema releases ready** to
   the required status checks for `main`. Select GitHub Actions as the expected
   source when available. Keep existing required checks and restrict bypass
   permissions as appropriate.
3. Verify on a disposable preview PR that the app deploys, tests pass, and
   **Schema releases ready** stays pending with merging blocked. Replace every
   preview pair with verified releases and verify that the status succeeds.

Require the **Schema releases ready** commit status, not the workflow job
**publish-status**. The job completes after publishing the status; it does not
wait for the schema releases. Until the required status is configured, the status
is informational and does not enforce a merge block.

Installing this code changes no repository settings. A maintainer must perform
this setup after the tooling is merged. GitHub documents
[required status checks](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches#require-status-checks-before-merging)
and [commit statuses](https://docs.github.com/en/rest/commits/statuses).

## Finish after the releases

Compare each release tag with the reviewed preview commit. If the commits differ,
compare the schema JSON contents and review/test any changes before promoting the
pair. The gate verifies tags and version compatibility; it does not establish that
a release contains exactly the previously reviewed preview content.

1. Replace each preview entry's SHA sources with verified release tags. Rename
   its `id` to the checklist's declared version, keeping existing release entries
   and avoiding duplicate pairs or IDs.
2. Update `default` to reference the intended entry ID. Remove any preview entries
   that are no longer needed; a nondefault preview also keeps the gate pending.
3. Commit the catalog changes, run tests, and review the deployment. The gate
   marks **Schema releases ready** successful only after all entries pass release
   validation.

Do not bypass the gate to finish a preview. Publishing or merging an upstream
schema PR alone does not change the catalog: the app PR must explicitly switch
its pins to verified release tags.
