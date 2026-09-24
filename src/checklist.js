import archive from "./data/checklist-versions.json" with { type: "json" };
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

function makeData(checklist, principlesSet) {
    const principleByCode = new Map(principlesSet.principles.map((principle) => [principle.code, principle]));

    return checklist.data.map((group) => ({
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
                itemIds: entry.items.map((item) => item.id),
            };
        }),
    }));
}

export const DEFAULT_VERSION = checklist.checklist_version ?? checklist.version;
export const ORIGINAL_VERSION = "0.1.0";
const bundles = { ...archive, [DEFAULT_VERSION]: { checklist, principles: principlesSet } };
export const AVAILABLE_VERSIONS = Object.keys(bundles);
export let VERSION = DEFAULT_VERSION;
export let CHECKLIST = checklist;
export let PRINCIPLES = principlesSet;
export let DATA = makeData(CHECKLIST, PRINCIPLES);

export function selectChecklist(version) {
    if (!Object.hasOwn(bundles, version)) throw new Error(`Checklist version ${version} is not available.`);
    const bundle = bundles[version];
    const data = makeData(bundle.checklist, bundle.principles);
    VERSION = version;
    CHECKLIST = bundle.checklist;
    PRINCIPLES = bundle.principles;
    DATA = data;
}
