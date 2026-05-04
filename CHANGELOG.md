# Changelog

## Upcoming

-   Fixed PDF printout top banner: preserved header dark gradient background, hid theme-toggle icon, and cleared page title during print to remove redundant browser-generated header text ([#106](https://github.com/stamped-principles/stamped-checklist/pull/106))
-   Added per-row colour tints (MUST/SHOULD/MAY) and a vertical divider between counters and percentage in the header progress block ([#103](https://github.com/stamped-principles/stamped-checklist/pull/103))
-   Added version-check CI workflow and agent instructions ([#101](https://github.com/stamped-principles/stamped-checklist/pull/101))

## 1.0.0

#### 🚀 Enhancement

-   Added CON branding to bottom-right corner ([#95](https://github.com/stamped-principles/stamped-checklist/pull/95))
-   Added per-level summary counters (MUST/SHOULD/MAY) with pass % in header ([#88](https://github.com/stamped-principles/stamped-checklist/pull/88))
-   Showed progress bar and status counts in print/PDF output ([#86](https://github.com/stamped-principles/stamped-checklist/pull/86))
-   Improved reasoning textarea: modern style, auto-expand, counter colour feedback ([#85](https://github.com/stamped-principles/stamped-checklist/pull/85))
-   Updated checklist top progress to segmented passing/failing/incomplete bar and counts ([#83](https://github.com/stamped-principles/stamped-checklist/pull/83))
-   Rendered principle descriptions full-width beneath requirement header metadata ([#81](https://github.com/stamped-principles/stamped-checklist/pull/81))
-   Enforced 250-character limit and added live counter for checklist "Reason" inputs ([#77](https://github.com/stamped-principles/stamped-checklist/pull/77))
-   Made checklist state fully URL-driven and removed legacy share flow ([#73](https://github.com/stamped-principles/stamped-checklist/pull/73))
-   Added persistence and sync for view-only toolbar URL settings (`cols`, `sections`) with column and section defaults ([#70](https://github.com/stamped-principles/stamped-checklist/pull/70))
-   Removed checkbox mode and made checklist response-only (Yes/No/Reason) ([#66](https://github.com/stamped-principles/stamped-checklist/pull/66))
-   Removed redundant toolbar Save action and aligned UI copy/tests with autosave behavior ([#56](https://github.com/stamped-principles/stamped-checklist/pull/56))
-   Added header GitHub repo icon and browser-aware light/dark theme toggle ([#49](https://github.com/stamped-principles/stamped-checklist/pull/49))
-   Added consent-gated Google Analytics with persistent cookie banner ([#47](https://github.com/stamped-principles/stamped-checklist/pull/47))
-   Added per-principle 💡 links to STAMPED examples pages ([#27](https://github.com/stamped-principles/stamped-checklist/pull/27))
-   Added Yes/No responses mode with per-item reason text ([#20](https://github.com/stamped-principles/stamped-checklist/pull/20))
-   Added toggleable flat layout with per-card level badges ([#13](https://github.com/stamped-principles/stamped-checklist/pull/13))
-   Removed import/export buttons in favour of URL sharing ([#11](https://github.com/stamped-principles/stamped-checklist/pull/11))
-   Made checklist layout more compact and use full horizontal width ([#9](https://github.com/stamped-principles/stamped-checklist/pull/9))
-   Flattened checklist: removed collapsible principle cards ([#7](https://github.com/stamped-principles/stamped-checklist/pull/7))

#### 🐛 Bug Fix

-   Fixed reason textarea collapsing to zero height on page load with saved state ([#93](https://github.com/stamped-principles/stamped-checklist/pull/93))
-   Locked header, toolbar, and intro text in place on scroll ([#92](https://github.com/stamped-principles/stamped-checklist/pull/92))
-   Preserved reason input across No/Yes toggles ([#82](https://github.com/stamped-principles/stamped-checklist/pull/82))
-   Fixed Reset to clear checkbox visual state ([#61](https://github.com/stamped-principles/stamped-checklist/pull/61))
-   Removed cookie consent banner and fixed checklist asset 404s on deployed page ([#48](https://github.com/stamped-principles/stamped-checklist/pull/48))
-   Fixed print to PDF ([#36](https://github.com/stamped-principles/stamped-checklist/pull/36))
-   Fixed deployment (403 on gh-pages push) and moved site files into `src/` ([#4](https://github.com/stamped-principles/stamped-checklist/pull/4))

#### 🏠 Internal

-   Enabled Playwright in Chromatic action ([#98](https://github.com/stamped-principles/stamped-checklist/pull/98))
-   Included Playwright integration coverage in Codecov reporting ([#80](https://github.com/stamped-principles/stamped-checklist/pull/80))
-   Integrated Codecov for coverage reporting ([#67](https://github.com/stamped-principles/stamped-checklist/pull/67))
-   Pulled checklist/principles schemas from upstream releases and removed local schema copies ([#54](https://github.com/stamped-principles/stamped-checklist/pull/54))
-   Moved tooling configuration to `configs/` and relocated Prettier config ([#45](https://github.com/stamped-principles/stamped-checklist/pull/45))
-   Harnessed LinkML checklist schema as the app's source of truth and fixed preview/pages checklist loading ([#44](https://github.com/stamped-principles/stamped-checklist/pull/44))
-   Created LinkML schema for reproducibility checklist ([#30](https://github.com/stamped-principles/stamped-checklist/pull/30))
-   Added version indicator and CI version bump enforcement ([#19](https://github.com/stamped-principles/stamped-checklist/pull/19))
-   Separated checklist data into a dedicated data file ([#15](https://github.com/stamped-principles/stamped-checklist/pull/15))
-   Updated pre-commit hooks ([#5](https://github.com/stamped-principles/stamped-checklist/pull/5))
-   Split CSS/JS out of HTML and added Prettier and pre-commit ([#2](https://github.com/stamped-principles/stamped-checklist/pull/2))

#### 📝 Documentation

-   Documented LinkML YAML schemas as the data model in README ([#51](https://github.com/stamped-principles/stamped-checklist/pull/51))
-   Added local build/development docs under `src/README.md` ([#31](https://github.com/stamped-principles/stamped-checklist/pull/31))

#### 🧪 Tests

-   Added main-page layout coverage via Storybook page stories and integration assertions ([#76](https://github.com/stamped-principles/stamped-checklist/pull/76))
-   Set up formal testing infrastructure: Vitest (unit), Playwright (e2e), Storybook/Chromatic (visual), and Codecov (coverage) ([#21](https://github.com/stamped-principles/stamped-checklist/pull/21))
