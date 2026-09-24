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

## Saved assessments and checklist versions

Each assessment belongs to one checklist version. Links include `checklist=VERSION`.
Browser saves include `checklist_version` and are stored separately under
`stamped_checklist:VERSION`. The `stamped_checklist` entry remembers the last saved
assessment for visits without a version in the URL.

The Checklist version selector opens a separate assessment for that version.
It restores that version's browser save if one exists, or starts with no answers.
It does not copy answers between versions. A link containing answers takes
precedence over browser saves.

Unversioned links and browser responses open checklist 0.1.0, the original
30-question release. Old positional answers are interpreted against those original
questions. There is no fixed mapping that transfers them to the current checklist.
Unversioned format 2 links from the earlier PR preview also use 0.1.0.
The older browser `checkboxes` format remains unsupported.

New saves use permanent question IDs and `format: 2`. This describes the answer
encoding, not the checklist version. New links contain UTF-8/base64 JSON responses.
If a requested checklist is unavailable, the app shows an error and preserves the
original link and saved answers instead of loading different questions.

### Retaining releases

`src/checklist-releases.json` lists the supported checklist releases, their matching
principles releases, and the default version for new assessments. Add new entries
without changing or removing old ones. The download script checks version matches
and bundles complete JSON pairs into the site. Opening an assessment requires no
request to GitHub. Multiple releases use the same app code.

The registry currently contains the only published checklist release, 0.1.0.
Add the M.4 release pair once its upstream tags are available. Tests use an additional
M.4 fixture to check version isolation without publishing unreleased data.
