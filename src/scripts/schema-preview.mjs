// Preview sources are data only, restricted to the two schema repositories.
export const SCHEMA_REPOS = {
    checklist: "stamped-principles/stamped-checklist-schema",
    principles: "stamped-principles/stamped-principles-schema",
};

export function previewSources(config) {
    if (!config || Object.keys(config).sort().join(",") !== "checklist,principles") {
        throw new Error("Schema preview must specify checklist and principles PR pins");
    }
    return Object.fromEntries(
        Object.entries(SCHEMA_REPOS).map(([kind, repo]) => {
            const pin = config[kind];
            if (
                !pin ||
                typeof pin.sha !== "string" ||
                !Number.isSafeInteger(pin.pr) ||
                pin.pr < 1 ||
                !/^[a-f0-9]{40}$/.test(pin.sha)
            ) {
                throw new Error(`Invalid ${kind} preview: use a positive PR number and full lowercase commit SHA`);
            }
            return [
                kind,
                {
                    pr: pin.pr,
                    sha: pin.sha,
                    url: `https://github.com/${repo}/pull/${pin.pr}`,
                    dataUrl: `https://raw.githubusercontent.com/${repo}/${pin.sha}/stamped-${kind}.json`,
                },
            ];
        })
    );
}

export function previewBundle(config, checklist, principles) {
    const sources = previewSources(config);
    const version = checklist.checklist_version ?? checklist.version;
    if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error("Preview checklist must declare a schema version");
    if (checklist.principles_version !== principles.version) {
        throw new Error("Preview principles version does not match checklist");
    }
    // Full pins keep preview saves distinct from releases and other preview revisions.
    const id = `${version}-preview.${sources.checklist.sha}.${sources.principles.sha}`;
    return {
        checklist: { ...checklist, _preview: { id, version, sources } },
        principles,
    };
}
