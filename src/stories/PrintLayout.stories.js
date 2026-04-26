import { withPrintStyles } from "./utils.js";

const MAX_REASON_LENGTH = 250;

/**
 * Builds a single check-item row with response buttons and an optional reason textarea.
 * @param {object} options
 * @param {string} options.text - The checklist item text.
 * @param {"yes"|"no"|null} [options.state] - Active response state.
 * @param {string} [options.reason] - Reason text (shown when state is "no").
 */
function buildCheckItem({ text, state = null, reason = "" }) {
    const yesActive = state === "yes" ? " active" : "";
    const noActive = state === "no" ? " active" : "";
    const reasonVisible = state === "no" ? " visible" : "";
    return `
        <div class="check-item">
            <div class="response-ui">
                <div class="response-row">
                    <span class="check-text">${text}</span>
                    <div class="response-btns">
                        <button type="button" class="response-btn yes-btn${yesActive}" aria-pressed="${
                            state === "yes"
                        }">✓ Yes</button>
                        <button type="button" class="response-btn no-btn${noActive}" aria-pressed="${
                            state === "no"
                        }">✗ No</button>
                    </div>
                </div>
                <textarea
                    class="reason-input${reasonVisible}"
                    placeholder="Reason for not meeting requirement..."
                    rows="1"
                    maxlength="${MAX_REASON_LENGTH}"
                >${reason}</textarea>
            </div>
        </div>
    `;
}

function buildPrintLayout({
    passingWidth = "0%",
    failingWidth = "0%",
    incompleteWidth = "100%",
    passingCount = 0,
    failingCount = 0,
    incompleteCount = 0,
    checkItems = [],
    principleCount = "0/3",
} = {}) {
    const root = document.createElement("div");
    root.innerHTML = `
        <div class="header">
            <div class="header-actions">
                <button id="theme-toggle" class="header-icon-button" type="button" aria-label="Toggle dark mode">☀️</button>
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
                                </div>
                            </div>
                            <span class="principle-count">${principleCount}</span>
                        </div>
                        <div class="principle-description">
                            Persistent content identification MUST be recorded for all components. Provenance of all
                            modifications MUST be recorded.
                        </div>
                    </div>
                    <div class="checklist">
                        ${checkItems.map(buildCheckItem).join("")}
                    </div>
                </div>
            </div>
        </div>
    `;
    return withPrintStyles(root);
}

export default {
    title: "Pages/PrintLayout",
};

export const Incomplete = {
    name: "Print layout (incomplete)",
    render: () =>
        buildPrintLayout({
            checkItems: [
                { text: "A persistent identifier (e.g. DOI, RRID) is recorded for every software dependency." },
                { text: "A commit SHA or tagged release is recorded for each dependency." },
                { text: "All data inputs have a persistent identifier recorded." },
            ],
            principleCount: "0/3",
        }),
};

export const Passing = {
    name: "Print layout (passing)",
    render: () =>
        buildPrintLayout({
            passingWidth: "100%",
            failingWidth: "0%",
            incompleteWidth: "0%",
            passingCount: 3,
            failingCount: 0,
            incompleteCount: 0,
            checkItems: [
                {
                    text: "A persistent identifier (e.g. DOI, RRID) is recorded for every software dependency.",
                    state: "yes",
                },
                { text: "A commit SHA or tagged release is recorded for each dependency.", state: "yes" },
                { text: "All data inputs have a persistent identifier recorded.", state: "yes" },
            ],
            principleCount: "3/3",
        }),
};

export const Mixed = {
    name: "Print layout (mixed results)",
    render: () =>
        buildPrintLayout({
            passingWidth: "34%",
            failingWidth: "33%",
            incompleteWidth: "33%",
            passingCount: 1,
            failingCount: 1,
            incompleteCount: 1,
            checkItems: [
                {
                    text: "A persistent identifier (e.g. DOI, RRID) is recorded for every software dependency.",
                    state: "yes",
                },
                {
                    text: "A commit SHA or tagged release is recorded for each dependency.",
                    state: "no",
                    reason: "Dependencies are pinned by name only; no commit SHAs or tagged releases are recorded.",
                },
                { text: "All data inputs have a persistent identifier recorded." },
            ],
            principleCount: "1/3",
        }),
};
