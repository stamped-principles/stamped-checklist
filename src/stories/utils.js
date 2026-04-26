/**
 * Wraps a story element in a themed container for Storybook previews.
 * @param {HTMLElement} element - The rendered component element to wrap.
 * @param {string} theme - Theme name to apply via data-theme (e.g. "light" or "dark").
 * @returns {HTMLDivElement}
 */
export function withTheme(element, theme) {
    const wrapper = document.createElement("div");
    wrapper.setAttribute("data-theme", theme);
    wrapper.style.padding = "0.5rem";
    wrapper.style.background = "var(--bg)";
    wrapper.style.color = "var(--text)";
    wrapper.appendChild(element);
    return wrapper;
}

/**
 * Wraps a story element with print-emulation styles for Storybook/Chromatic previews.
 * Mirrors the @media print rules as scoped screen styles so the print layout is
 * visible in screen context (and captured by Chromatic snapshots).
 * @param {HTMLElement} element - The rendered component element to show with print styles.
 * @returns {HTMLDivElement}
 */
export function withPrintStyles(element) {
    if (!document.getElementById("story-print-override")) {
        const style = document.createElement("style");
        style.id = "story-print-override";
        style.textContent = `
            .print-preview .toolbar { display: none !important; }
            .print-preview .progress-bar-container {
                display: block !important;
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
            }
            .print-preview .progress-segment.pass { background: #2ecc71 !important; }
            .print-preview .progress-segment.fail { background: #ff6b6b !important; }
            .print-preview .progress-segment.incomplete {
                background: #7f8c8d !important;
                background-image: none !important;
            }
            .print-preview .progress-text { display: inline-block !important; }
            .print-preview .cards-grid,
            .print-preview .cards-grid.cols-auto {
                columns: auto !important;
                column-count: 1 !important;
                display: block !important;
            }
            .print-preview body,
            .print-preview .container { background: white; }
            .print-preview .response-ui { display: block !important; }
            .print-preview .response-btn {
                border: 1px solid #ddd !important;
                color: #999 !important;
                background: white !important;
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
            }
            .print-preview .response-btn.active.yes-btn {
                border-color: #27ae60 !important;
                color: #27ae60 !important;
            }
            .print-preview .response-btn.active.no-btn {
                border-color: #c0392b !important;
                color: #c0392b !important;
            }
            .print-preview .reason-input.visible {
                display: block !important;
                border: 1px solid #ddd !important;
                background: white !important;
            }
        `;
        document.head.appendChild(style);
    }
    const wrapper = document.createElement("div");
    wrapper.className = "print-preview";
    wrapper.appendChild(element);
    return wrapper;
}
