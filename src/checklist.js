import checklist from "./data/stamped-checklist.json" with { type: "json" };
import principlesSet from "./data/stamped-principles.json" with { type: "json" };

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
        const linkedPrinciples = entry.principle_codes.map((code) => {
            const principle = principleByCode.get(code);
            if (!principle) {
                throw new Error(`Unknown principle code in checklist data: ${code}`);
            }
            return principle;
        });
        if (linkedPrinciples.length === 0) {
            throw new Error("Checklist entry must reference at least one principle code");
        }
        const primaryCategory = linkedPrinciples[0].category;
        const principleName = CATEGORY_LABELS[primaryCategory];
        if (!principleName) {
            throw new Error(`Unknown principle category in checklist data: ${String(primaryCategory)}`);
        }

        return {
            code: entry.principle_codes.join(" + "),
            name: principleName,
            desc: linkedPrinciples.map((principle) => principle.statement).join(" "),
            items: entry.items.map((item) => item.text),
        };
    }),
}));

const VERSION = checklist.version;

export { VERSION, DATA, checklist as CHECKLIST, principlesSet as PRINCIPLES };
