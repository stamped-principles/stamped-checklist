import { DATA } from "../checklist.js";

const section = DATA[0]; // must section
const shouldSection = DATA[1]; // should section
const maySection = DATA[2]; // may section

/** Build a principle card DOM element matching the structure created by buildChecklist(). */
function buildCard(sec, principle, si, pi) {
    const card = document.createElement("div");
    card.className = `principle-card ${sec.level}`;
    card.id = `card_${si}_${pi}`;

    const numItems = principle.items.length;

    card.innerHTML = `
        <div class="principle-header">
            <span class="level-badge ${sec.level}">${sec.label}</span>
            <span class="principle-code">${principle.code}</span>
            <div style="flex:1">
                <div class="principle-title">${principle.name}</div>
                <div style="font-size:0.76rem; color:var(--text-light); margin-top:0.1rem;">${principle.desc}</div>
            </div>
            <span class="principle-count" id="count_${si}_${pi}">0/${numItems}</span>
        </div>
        <div class="checklist">
            ${principle.items
                .map(
                    (item, ii) => `
                <div class="check-item">
                    <input type="checkbox" id="s${si}_p${pi}_i${ii}">
                    <label for="s${si}_p${pi}_i${ii}">
                        <span class="checkbox-custom">✓</span>
                        <span class="check-text">${item}</span>
                    </label>
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
        card.querySelectorAll("input[type=checkbox]").forEach((cb) => (cb.checked = true));
        return card;
    },
};
