import { DATA } from "../checklist.js";
import { withTheme } from "./utils.js";

const section = DATA[0]; // must section
const shouldSection = DATA[1]; // should section
const maySection = DATA[2]; // may section

function escapeHtml(text) {
    return String(text)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function renderInlineMarkdown(text) {
    return String(text)
        .split(/(`[^`]*`)/g)
        .map((part) => {
            if (part.startsWith("`") && part.endsWith("`")) {
                return `<code>${escapeHtml(part.slice(1, -1))}</code>`;
            }
            return escapeHtml(part);
        })
        .join("");
}

function getPrincipleExamplesURL(principle) {
    const match = (principle.name || "").match(/[A-Za-z]/);
    const firstLetter = match ? match[0].toLowerCase() : "";
    return `https://stamped-principles.github.io/stamped-examples/stamped_principles/${firstLetter}/`;
}

/** Build a principle card DOM element matching the structure created by buildChecklist(). */
function buildCard(sec, principle, si, pi) {
    const card = document.createElement("div");
    card.className = `principle-card ${sec.level}`;
    card.id = `card_${si}_${pi}`;

    const numItems = principle.items.length;
    const principleName = escapeHtml(principle.name);
    const principleDescription = renderInlineMarkdown(principle.desc);

    card.innerHTML = `
        <div class="principle-header">
            <span class="level-badge ${sec.level}">${sec.label}</span>
            <span class="principle-code">${principle.code}</span>
            <div style="flex:1">
                <div class="principle-title-row">
                    <div class="principle-title">${principleName}</div>
                    <a
                        class="principle-examples-link"
                        href="${getPrincipleExamplesURL(principle)}"
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="View ${principleName} examples"
                        title="View examples for ${principleName}"
                    >💡</a>
                </div>
                <div style="font-size:0.76rem; color:var(--text-light); margin-top:0.1rem;">${principleDescription}</div>
            </div>
            <span class="principle-count" id="count_${si}_${pi}">0/${numItems}</span>
        </div>
        <div class="checklist">
            ${principle.items
                .map(
                    (item, ii) => `
                <div class="check-item">
                    <div class="response-ui">
                        <div class="response-row">
                            <span class="check-text">${renderInlineMarkdown(item)}</span>
                            <div class="response-btns">
                                <button type="button" class="response-btn yes-btn">✓ Yes</button>
                                <button type="button" class="response-btn no-btn">✗ No</button>
                            </div>
                        </div>
                    </div>
                </div>
            `
                )
                .join("")}
        </div>
    `;
    return card;
}

export default {
    title: "Components/ChecklistCard",
};

export const MustCard = {
    name: "MUST principle card",
    render: () => buildCard(section, section.principles[0], 0, 0),
};

export const ShouldCard = {
    name: "SHOULD principle card",
    render: () => buildCard(shouldSection, shouldSection.principles[0], 1, 0),
};

export const MayCard = {
    name: "MAY principle card",
    render: () => buildCard(maySection, maySection.principles[0], 2, 0),
};

export const CompleteCard = {
    name: "Completed principle card",
    render: () => {
        const card = buildCard(section, section.principles[0], 0, 0);
        card.classList.add("complete");
        const count = card.querySelector(".principle-count");
        const n = section.principles[0].items.length;
        count.textContent = `${n}/${n}`;
        count.classList.add("done");
        card.querySelectorAll(".response-btn.yes-btn").forEach((btn) => btn.classList.add("active"));
        return card;
    },
};

export const InlineMarkdownCodeCard = {
    name: "Inline markdown code rendering",
    render: () => buildCard(section, section.principles[1], 0, 1),
};

export const MustCardDark = {
    name: "MUST principle card (dark mode)",
    render: () => withTheme(buildCard(section, section.principles[0], 0, 0), "dark"),
};
