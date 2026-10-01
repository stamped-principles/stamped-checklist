# Checklist for STAMPED Principles

An interactive checklist for compliance to STAMPED principles.

## Data model

The LinkML schemas and JSON instances are maintained in dedicated repositories:

-   Principles: <https://github.com/stamped-principles/stamped-principles-schema>
-   Checklist: <https://github.com/stamped-principles/stamped-checklist-schema>

This app pulls the checklist and principle JSON instances from those repositories into `src/data/` via `npm run sync:schemas`.
`src/checklist-releases.json` is the single catalog of explicitly configured checklist/principles pairs. Its `entries` may contain verified release tags, pinned schema PR commits, or a mix of the two, and `default` selects an entry by ID. New upstream releases and PR updates are never picked up automatically; adopting them is a deliberate catalog change.

An all-tag entry is released, with its ID matching the checklist's declared version. Any SHA-sourced entry is an unreleased preview with its own commit-pair assessment identity. Multiple previews can coexist with released versions, and only the manually configured pairs appear in the app.

For the catalog format, preview behavior, and one-time required-status setup, see [schema catalog and previews](docs/schema-previews.md).

## Licensing

This project is licensed under [CC-BY-4.0](LICENSE) and follows the [REUSE specification](https://reuse.software/) for machine-readable copyright and licensing information.

-   Full license text: `LICENSES/CC-BY-4.0.txt` (the root `LICENSE` is a symlink)
-   Per-file declarations: `REUSE.toml` (single catch-all block — everything is licensed under CC-BY-4.0)
-   Verification: `pre-commit run reuse --all-files`, or install [`reuse`](https://github.com/fsfe/reuse-tool) and run `reuse lint`

<!-- REUSE-IgnoreStart -->

New files do not need per-file SPDX headers — the `path = "**"` block in `REUSE.toml` covers the entire tree.
If a file ever needs a different license, add a targeted block or an in-file `SPDX-License-Identifier:` header.

<!-- REUSE-IgnoreEnd -->
