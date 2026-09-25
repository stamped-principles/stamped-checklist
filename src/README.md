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

New links use format 3 and include the checklist version inside the encoded answers.
Changing only the `checklist` query is rejected when it disagrees with that version.
Existing format 2 and unversioned links remain readable and are rewritten as format 3.
Those older formats cannot detect a manually changed version when all item IDs fit.
Reset clears the default version's saved answers; older version saves remain intact.

To adopt a new published checklist, append its version and matching release tags to
`src/checklist-releases.json`, update `defaultVersion`, then build and deploy.
Keep existing entries so old assessments remain available.
