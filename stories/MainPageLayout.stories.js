import { withTheme } from "./utils.js";

function buildLevelStatRow({ level, label, passingWidth, failingWidth, incompleteWidth, passing, failing, total }) {
    const incomplete = total - passing - failing;
    const pct = total > 0 ? Math.round((passing / total) * 100) : 0;
    return `
        <div class="level-stat-row" data-level-stat="${level}">
            <span class="section-badge ${level}">${label}</span>
            <div class="level-stat-bar-container">
                <div class="level-stat-bar">
                    <div class="progress-segment pass" style="width:${passingWidth}"></div>
                    <div class="progress-segment fail" style="width:${failingWidth}"></div>
                    <div class="progress-segment incomplete" style="width:${incompleteWidth}"></div>
                </div>
            </div>
            <span class="level-stat-counts">
                <span class="pass">${passing}✓</span>
                <span class="fail"> ${failing}✗</span>
                <span class="incomplete"> ${incomplete}?</span>
                <span class="level-stat-pct"> ${pct}%</span>
            </span>
        </div>
    `;
}

function buildMainPageLayout({ totalPassing = 0, totalFailing = 0, totalCount = 30 } = {}) {
    const totalIncomplete = totalCount - totalPassing - totalFailing;
    const totalPct = totalCount > 0 ? Math.round((totalPassing / totalCount) * 100) : 0;
    const passingPct = totalCount > 0 ? (totalPassing / totalCount) * 100 : 0;
    const failingPct = totalCount > 0 ? (totalFailing / totalCount) * 100 : 0;
    const incompletePct = totalCount > 0 ? (totalIncomplete / totalCount) * 100 : 100;

    const root = document.createElement("div");
    root.innerHTML = `
        <div class="header">
            <div class="header-actions">
                <button id="theme-toggle" class="header-icon-button" type="button" aria-label="Toggle dark mode">☀️</button>
                <a
                    class="header-icon-button github-link"
                    href="https://github.com/stamped-principles/stamped-checklist"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Open stamped-checklist on GitHub"
                    title="View repository on GitHub"
                >
                    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                        <path
                            d="M8 0C3.58 0 0 3.58 0 8a8.01 8.01 0 0 0 5.47 7.59c.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.5-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.62 7.62 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.19 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
                        ></path>
                    </svg>
                </a>
            </div>
            <h1>📋 STAMPED Compliance Checklist</h1>
            <p>Assess your research objects against the STAMPED principles</p>
            <div class="level-stats" id="levelStats">
                ${buildLevelStatRow({
                    level: "total",
                    label: "Total",
                    passingWidth: `${passingPct}%`,
                    failingWidth: `${failingPct}%`,
                    incompleteWidth: `${incompletePct}%`,
                    passing: totalPassing,
                    failing: totalFailing,
                    total: totalCount,
                })}
                ${buildLevelStatRow({
                    level: "must",
                    label: "MUST",
                    passingWidth: "0%",
                    failingWidth: "0%",
                    incompleteWidth: "100%",
                    passing: 0,
                    failing: 0,
                    total: 17,
                })}
                ${buildLevelStatRow({
                    level: "should",
                    label: "SHOULD",
                    passingWidth: "0%",
                    failingWidth: "0%",
                    incompleteWidth: "100%",
                    passing: 0,
                    failing: 0,
                    total: 8,
                })}
                ${buildLevelStatRow({
                    level: "may",
                    label: "MAY",
                    passingWidth: "0%",
                    failingWidth: "0%",
                    incompleteWidth: "100%",
                    passing: 0,
                    failing: 0,
                    total: 5,
                })}
            </div>
        </div>
        <div class="toolbar">
            <button type="button"><span class="icon">🖨️</span> Print</button>
            <button type="button" class="danger"><span class="icon">🗑️</span> Reset</button>
            <div class="col-toggle">
                <span class="col-toggle-label">Columns:</span>
                <label class="col-toggle-option"><input type="radio" name="cols" value="1" /> 1</label>
                <label class="col-toggle-option"><input type="radio" name="cols" value="2" /> 2</label>
                <label class="col-toggle-option"><input type="radio" name="cols" value="auto" checked /> Auto</label>
            </div>
            <div class="col-toggle">
                <span class="col-toggle-label">Sections:</span>
                <label class="col-toggle-option"><input type="radio" name="sections" value="on" /> On</label>
                <label class="col-toggle-option"><input type="radio" name="sections" value="off" checked /> Off</label>
            </div>
        </div>
        <div class="container" id="app">
            <div class="intro-text">
                This checklist helps you assess compliance with the <strong>STAMPED</strong> principles for computational reproducibility.
                <div class="legend">
                    <div class="legend-item"><div class="legend-dot must"></div>MUST — Required</div>
                    <div class="legend-item"><div class="legend-dot should"></div>SHOULD — Recommended</div>
                    <div class="legend-item"><div class="legend-dot may"></div>MAY — Optional</div>
                </div>
            </div>
            <div class="cards-grid cols-auto">
                <div class="principle-card must">
                    <div class="principle-header">
                        <div class="principle-header-main">
                            <span class="level-badge must">MUST</span>
                            <span class="principle-code">T.1 + T.3 + T.5</span>
                            <div class="principle-heading">
                                <div class="principle-title-row">
                                    <div class="principle-title">Tracking</div>
                                    <a class="principle-examples-link" href="#" aria-label="View Tracking examples">💡</a>
                                </div>
                            </div>
                            <span class="principle-count">0/3</span>
                        </div>
                        <div class="principle-description">
                            Persistent content identification MUST be recorded for all components. Provenance of all
                            modifications MUST be recorded.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    return root;
}

export default {
    title: "Pages/MainPageLayout",
};

export const Default = {
    name: "Main page layout (incomplete)",
    render: () => buildMainPageLayout(),
};

export const Passing = {
    name: "Main page layout (passing)",
    render: () =>
        buildMainPageLayout({
            totalPassing: 30,
            totalFailing: 0,
            totalCount: 30,
        }),
};

export const Failed = {
    name: "Main page layout (failed)",
    render: () =>
        buildMainPageLayout({
            totalPassing: 10,
            totalFailing: 10,
            totalCount: 30,
        }),
};

export const DefaultDark = {
    name: "Main page layout (dark mode, incomplete)",
    render: () => withTheme(buildMainPageLayout(), "dark"),
};
