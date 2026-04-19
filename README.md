# Checklist for STAMPED Principles

An interactive checklist for compliance to STAMPED principles.

## Editing the checklist

Checklist entries are defined in [`schemas/stamped-checklist.json`](schemas/stamped-checklist.json)
and principle definitions are in [`schemas/stamped-principles.json`](schemas/stamped-principles.json).
The web app reads these LinkML JSON files through [`src/checklist.js`](src/checklist.js).

## Versioning

The checklist version is defined by the `version` field in
[`schemas/stamped-checklist.json`](schemas/stamped-checklist.json). It is
displayed in the bottom-left corner of the page (and on printed copies) so that
a record is kept of which version of the checklist was used.

When making meaningful changes to the checklist content, bump the `version` field in
[`schemas/stamped-checklist.json`](schemas/stamped-checklist.json) following
[Semantic Versioning](https://semver.org/):

-   **Patch** (e.g. `1.0.0` → `1.0.1`): typo fixes or minor wording edits that do not change the intent of any item.
-   **Minor** (e.g. `1.0.0` → `1.1.0`): new checklist items added or existing items reworded in a way that changes their meaning.
-   **Major** (e.g. `1.0.0` → `2.0.0`): significant restructuring of sections or removal of items.
