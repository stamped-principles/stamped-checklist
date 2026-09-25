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

## Checklist releases

Plain visits and Reset open the default checklist. The dropdown lists newest first
and copies answers for unchanged questions to the selected version. New, changed,
and removed questions do not inherit answers. Matching requires the same item ID,
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

To adopt a new published checklist, append its version and matching release tags to
`src/checklist-releases.json`, update `defaultVersion`, then build and deploy.
Keep existing entries so old assessments remain available.
