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

function buildLevelStatRow({ level, label, passing, failing, total }) {
    const incomplete = total - passing - failing;
    const pct = total > 0 ? Math.round((passing / total) * 100) : 0;
    const passingPct = total > 0 ? (passing / total) * 100 : 0;
    const failingPct = total > 0 ? (failing / total) * 100 : 0;
    const incompletePct = total > 0 ? (incomplete / total) * 100 : 100;
    return `
        <div class="level-stat-row" data-level-stat="${level}">
            <span class="section-badge ${level}">${label}</span>
            <div class="level-stat-bar-container">
                <div class="level-stat-bar">
                    <div class="progress-segment pass" style="width:${passingPct}%"></div>
                    <div class="progress-segment fail" style="width:${failingPct}%"></div>
                    <div class="progress-segment incomplete" style="width:${incompletePct}%"></div>
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

function buildPrintLayout({
    totalPassing = 0,
    totalFailing = 0,
    totalCount = 3,
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
            <div class="level-stats" id="levelStats">
                ${buildLevelStatRow({
                    level: "total",
                    label: "Total",
                    passing: totalPassing,
                    failing: totalFailing,
                    total: totalCount,
                })}
                ${buildLevelStatRow({
                    level: "must",
                    label: "MUST",
                    passing: totalPassing,
                    failing: totalFailing,
                    total: totalCount,
                })}
                ${buildLevelStatRow({ level: "should", label: "SHOULD", passing: 0, failing: 0, total: 0 })}
                ${buildLevelStatRow({ level: "may", label: "MAY", passing: 0, failing: 0, total: 0 })}
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
            totalPassing: 3,
            totalFailing: 0,
            totalCount: 3,
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
            totalPassing: 1,
            totalFailing: 1,
            totalCount: 3,
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
