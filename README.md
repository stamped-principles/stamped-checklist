# Checklist for STAMPED Principles

An interactive checklist for compliance to STAMPED principles.

## Editing the checklist

The checklist questions and sections are defined in [`src/checklist.json`](src/checklist.json).

Checklist entry structure is described in [`src/checklist.schema.json`](src/checklist.schema.json),
and validated in unit tests.

## Versioning

The checklist version is defined by the `version` field in [`src/checklist.schema.json`](src/checklist.schema.json).
It is displayed in the bottom-left corner of the page (and on printed copies) so that a record is kept of which version of the checklist was used.

When making meaningful changes to the checklist content, bump the `version` value following [Semantic Versioning](https://semver.org/):

-   **Patch** (e.g. `1.0.0` → `1.0.1`): typo fixes or minor wording edits that do not change the intent of any item.
-   **Minor** (e.g. `1.0.0` → `1.1.0`): new checklist items added or existing items reworded in a way that changes their meaning.
-   **Major** (e.g. `1.0.0` → `2.0.0`): significant restructuring of sections or removal of items.
