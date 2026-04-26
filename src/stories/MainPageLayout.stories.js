import { withTheme } from "./utils.js";

function buildMainPageLayout({
    passingWidth = "0%",
    failingWidth = "0%",
    incompleteWidth = "100%",
    passingCount = 0,
    failingCount = 0,
    incompleteCount = 0,
} = {}) {
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
            <div class="progress-bar-container">
                <div class="progress-bar" id="progressBar">
                    <div class="progress-segment pass" data-progress-segment="passing" style="width:${passingWidth}"></div>
                    <div class="progress-segment fail" data-progress-segment="failing" style="width:${failingWidth}"></div>
                    <div class="progress-segment incomplete" data-progress-segment="incomplete" style="width:${incompleteWidth}"></div>
                </div>
            </div>
            <div class="progress-text" id="progressText">
                <span class="progress-value pass" data-progress-value="passing" aria-label="passing items">${passingCount}</span> /
                <span class="progress-value fail" data-progress-value="failing" aria-label="failing items">${failingCount}</span> /
                <span class="progress-value incomplete" data-progress-value="incomplete" aria-label="incomplete items">${incompleteCount}</span>
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
            passingWidth: "100%",
            failingWidth: "0%",
            incompleteWidth: "0%",
            passingCount: 3,
            failingCount: 0,
            incompleteCount: 0,
        }),
};

export const Failed = {
    name: "Main page layout (failed)",
    render: () =>
        buildMainPageLayout({
            passingWidth: "34%",
            failingWidth: "33%",
            incompleteWidth: "33%",
            passingCount: 1,
            failingCount: 1,
            incompleteCount: 1,
        }),
};

export const DefaultDark = {
    name: "Main page layout (dark mode, incomplete)",
    render: () => withTheme(buildMainPageLayout(), "dark"),
};
