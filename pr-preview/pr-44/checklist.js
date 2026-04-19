import checklist from "../schemas/stamped-checklist.json" with { type: "json" };
import principlesSet from "../schemas/stamped-principles.json" with { type: "json" };

const CATEGORY_LABELS = {
    self_contained: "Self-containment",
    tracked: "Tracking",
    actionable: "Actionability",
    modular: "Modularity",
    portable: "Portability",
    ephemeral: "Ephemerality",
    distributable: "Distributability",
};

const principleByCode = new Map(principlesSet.principles.map((principle) => [principle.code, principle]));

const DATA = checklist.data.map((group) => ({
    level: group.level,
    label: group.level.toUpperCase(),
    principles: group.entries.map((entry) => {
        const linkedPrinciples = entry.principle_codes.map((code) => principleByCode.get(code)).filter(Boolean);
        const primaryCategory = linkedPrinciples[0]?.category;

        return {
            code: entry.principle_codes.join(" + "),
            name: CATEGORY_LABELS[primaryCategory] || "STAMPED Principle",
            desc: linkedPrinciples.map((principle) => principle.statement).join(" "),
            items: entry.items.map((item) => item.text),
        };
    }),
}));

const VERSION = checklist.version;

export { VERSION, DATA };
