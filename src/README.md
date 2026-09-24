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

Saved assessments reopen their original checklist; answers stay separate by version.
Unversioned saves use 0.1.0.

To adopt a new published checklist, append its version and matching release tags to
`src/checklist-releases.json`, update `defaultVersion`, then build and deploy.
Keep existing entries so old assessments remain available.
