export const PERSISTENCE_FORMAT = 2;
// Positional keys are interpreted only against the selected original checklist.
function positions(data) {
    return data.flatMap((section, si) =>
        section.principles.flatMap((entry, pi) => entry.itemIds.map((id, ii) => [`s${si}_p${pi}_i${ii}`, id]))
    );
}

// Convert only at the persistence boundary; DOM IDs can remain positional.
export function readResponses(responses, format, data) {
    if (format !== undefined && format !== PERSISTENCE_FORMAT) {
        throw new Error("Unsupported saved-answer format");
    }
    if (!responses || typeof responses !== "object" || Array.isArray(responses)) {
        throw new Error("Invalid saved responses");
    }
    const legacyIds = new Map(positions(data));
    const validIds = new Set(legacyIds.values());
    const result = {};
    for (const [key, response] of Object.entries(responses)) {
        const id = format === PERSISTENCE_FORMAT ? key : legacyIds.get(key);
        if (!id || !validIds.has(id)) throw new Error("Question does not belong to this checklist version");
        if (!response || ![null, "yes", "no"].includes(response.value) || typeof response.reason !== "string") {
            throw new Error("Invalid saved answer");
        }
        result[id] = { value: response.value, reason: response.reason.slice(0, 250) };
    }
    return result;
}

export function readLegacyState(bits, data) {
    const items = positions(data);
    if (!/^[01]+$/.test(bits) || bits.length !== items.length) throw new Error("Unknown legacy checklist ordering");
    return Object.fromEntries(
        items.map(([, id], index) => [id, { value: bits[index] === "1" ? "yes" : null, reason: "" }])
    );
}
