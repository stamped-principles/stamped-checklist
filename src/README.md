# Local development and build

From the repository root:

1. Install dependencies:

    ```bash
    npm ci
    ```

2. Start the local development server:

    ```bash
    npm run dev
    ```

3. Build for production:

    ```bash
    npm run build
    ```

4. Preview the production build locally:

    ```bash
    npm run preview
    ```

## Checklist versions

Plain visits and Reset open the default checklist. The dropdown lists configured
releases and previews and copies answers for unchanged questions to the selected
version. New, changed, and removed questions do not inherit answers. Matching requires the same item ID,
question text, linked principle codes, principle statements, and requirement level.
Saved assessment links reopen their original version; unversioned links use 0.1.0.

URLs identify the selected checklist with `checklist` and the source answers with
`responses_version`. Editing `checklist` translates unchanged answers from the
source version and rewrites the URL with both versions set to the target. A brief
summary reports carried answers, unanswered questions, and omitted answers.

Format 3 also embeds the source version in the answers. If `responses_version`
disagrees with that embedded version, the original URL is preserved with an error.
Existing format 2 and unversioned links remain readable. For older links without
`responses_version`, the source is the original `checklist` value (or 0.1.0 when
absent); add `responses_version` before editing their target version.
Reset clears the default version's saved answers; older version saves remain intact.

## Catalog configuration

`src/checklist-releases.json` is the single catalog for releases and previews. Its
shape is `{ "default": "entry-id", "entries": [...] }`. Each entry has an `id`,
a `checklist` source, and a `principles` source. Each source specifies either a
verified release `tag` or a full lowercase commit `sha` with its `pr` number.
`default` must reference an entry ID.

To adopt a published checklist, append an entry with both matching release tags
and an ID equal to the checklist's declared version, then update `default` as
needed, build, and deploy. Keep existing releases so old assessments remain
available. Tags are verified Git release tags and resolved to commits; branch
names do not qualify, and no separate GitHub Release object is required. Paired schema
versions must be compatible.

Any entry with a SHA source is a preview. Multiple previews and mixed tag/SHA pairs
are supported, and their IDs can be friendly review names. Their assessment
identities include the checklist version and both resolved commit SHAs, keeping
answers separate from releases and other preview revisions. Only manually
configured pairs are included; nothing automatically discovers or pairs releases.

See [schema catalog and previews](../docs/schema-previews.md) for examples, source
validation, answer-restoration behavior, and the required merge-gate setup. The
gate validates every entry: valid previews keep it pending, verified releases
allow success, and errors fail closed. No labels or repository-setting changes
are automated.

Schema sync verifies tags and PR pins using the GitHub REST API. Unauthenticated
requests share GitHub's hourly rate limit, so repeated local dev/test/build runs
may reach it. If you already have a read-only `GITHUB_TOKEN` or `GH_TOKEN`, export
it in your shell before running these commands; otherwise wait for the limit to
reset. No token is stored by this app. Read-only CI jobs use their existing
GitHub Actions token; no additional credential or permission is needed.
