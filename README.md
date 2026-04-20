# Checklist for STAMPED Principles

An interactive checklist for compliance to STAMPED principles.

## Data model

The LinkML schemas and JSON instances are maintained in dedicated repositories:

-   Principles: <https://github.com/stamped-principles/stamped-principles-schema>
-   Checklist: <https://github.com/stamped-principles/stamped-checklist-schema>

This app pulls the checklist and principle JSON instances from those repositories into `src/data/` via `npm run sync:schemas`.

## Editing the checklist

Edit checklist and principle content in the schema repositories above. The web app reads those upstream JSON files through [`src/checklist.js`](src/checklist.js).

## Versioning

The checklist version is defined by the `version` field in the upstream checklist JSON
(in `stamped-principles/stamped-checklist-schema`). It is
displayed in the bottom-left corner of the page (and on printed copies) so that
a record is kept of which version of the checklist was used.

When making meaningful changes to the checklist content, bump that `version` field following
[Semantic Versioning](https://semver.org/):

-   **Patch** (e.g. `1.0.0` → `1.0.1`): typo fixes or minor wording edits that do not change the intent of any item.
-   **Minor** (e.g. `1.0.0` → `1.1.0`): new checklist items added or existing items reworded in a way that changes their meaning.
-   **Major** (e.g. `1.0.0` → `2.0.0`): significant restructuring of sections or removal of items.
