This file provides guidance to all AI agents when working with code in this repository.

## MANDATORY: Read before making any code changes

Before committing any changes, you MUST:

-   To the best of your ability, ensure tests are passing
-   Follow assertion style (actual on left, expected on right)
-   Run pre-commit
-   Always bump the version in `package.json` appropriately when any file under `src/` (except `src/stories/` or `src/tests/`), `configs/`, or `package.json`/`package-lock.json` itself, is changed
-   Leave a short description of the change or addition in the top `## Upcoming` section of the `CHANGELOG.md`; include the GitHub PR link at the end of each entry in the format `([#N](https://github.com/stamped-principles/stamped-checklist/pull/N))`
-   PR titles should be human-readable and in the past tense; they should NOT use conventional commit style
