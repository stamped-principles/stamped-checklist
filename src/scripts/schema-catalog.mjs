// Shared by schema sync and the trusted-base merge gate. Catalog entries are data only.
export const SCHEMA_REPOS = {
    checklist: "stamped-principles/stamped-checklist-schema",
    principles: "stamped-principles/stamped-principles-schema",
};
const SHA = /^[a-f0-9]{40}$/;
const VERSION = /^\d+\.\d+\.\d+$/;
const TAG = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

function keys(value, expected) {
    return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        Object.keys(value).sort().join(",") === [...expected].sort().join(",")
    );
}

export function validateCatalog(catalog) {
    if (!keys(catalog, ["default", "entries"]) || !Array.isArray(catalog.entries) || !catalog.entries.length) {
        throw new Error("Schema catalog must contain a default and a nonempty entries array");
    }
    const ids = new Set();
    for (const entry of catalog.entries) {
        if (!keys(entry, ["id", "checklist", "principles"]) || typeof entry.id !== "string" || !ID.test(entry.id)) {
            throw new Error("Catalog entries require a safe id, checklist source, and principles source");
        }
        if (ids.has(entry.id)) throw new Error(`Duplicate catalog id: ${entry.id}`);
        ids.add(entry.id);
        for (const kind of Object.keys(SCHEMA_REPOS)) {
            const pin = entry[kind];
            const release = keys(pin, ["tag"]) && typeof pin.tag === "string" && TAG.test(pin.tag);
            const preview =
                keys(pin, ["sha", "pr"]) &&
                typeof pin.sha === "string" &&
                SHA.test(pin.sha) &&
                Number.isSafeInteger(pin.pr) &&
                pin.pr > 0;
            if (!release && !preview)
                throw new Error(
                    `Invalid ${kind} source for ${entry.id}: use a release tag or full lowercase SHA and positive PR number`
                );
        }
        if (!entry.checklist.sha && !entry.principles.sha && !VERSION.test(entry.id)) {
            throw new Error(`Released catalog id must be a schema version: ${entry.id}`);
        }
    }
    if (typeof catalog.default !== "string" || !ids.has(catalog.default)) {
        throw new Error("Default entry is not in the schema catalog");
    }
    return catalog;
}

export async function downloadJSON(url) {
    const headers = { Accept: "application/vnd.github+json" };
    const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(30000) });
    if (!response.ok) {
        const hint =
            response.status === 403 || response.status === 429
                ? " GitHub API access or rate limit: retry later, or use an existing read-only GITHUB_TOKEN/GH_TOKEN."
                : " Check the configured repository, tag/PR pin, and schema file.";
        throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}.${hint}`);
    }
    return response.json();
}

export async function resolveSource(kind, pin, { getJSON = downloadJSON } = {}) {
    if (!Object.hasOwn(SCHEMA_REPOS, kind)) throw new Error("Unknown schema source");
    const repo = SCHEMA_REPOS[kind];
    const api = `https://api.github.com/repos/${repo}`;
    let sha = pin.sha;
    if (pin.tag) {
        const ref = await getJSON(`${api}/git/ref/tags/${encodeURIComponent(pin.tag)}`);
        if (ref.ref !== `refs/tags/${pin.tag}`) throw new Error(`No release tag for ${kind}: ${pin.tag}`);
        let object = ref.object;
        // Peel annotated tags without ever accepting a branch or a mutable raw URL.
        for (let depth = 0; object?.type === "tag" && depth < 10; depth++) {
            if (!SHA.test(object.sha)) throw new Error(`Invalid ${kind} tag object`);
            object = (await getJSON(`${api}/git/tags/${object.sha}`)).object;
        }
        if (object?.type !== "commit") throw new Error(`Release tag does not resolve to a commit: ${pin.tag}`);
        sha = object.sha;
    } else {
        // A pin can be older than the current PR head, but must belong to that PR.
        let found = false;
        for (let page = 1; !found; page++) {
            const commits = await getJSON(`${api}/pulls/${pin.pr}/commits?per_page=100&page=${page}`);
            if (!Array.isArray(commits)) throw new Error(`Invalid ${kind} PR commit response`);
            found = commits.some((commit) => commit.sha === sha);
            if (commits.length < 100) break;
        }
        if (!found) throw new Error(`${kind} SHA does not belong to PR #${pin.pr}`);
    }
    if (typeof sha !== "string" || !SHA.test(sha)) throw new Error(`Could not resolve ${kind} to a full commit SHA`);
    const file = await getJSON(`${api}/contents/stamped-${kind}.json?ref=${sha}`);
    if (file.type !== "file" || file.encoding !== "base64" || typeof file.content !== "string") {
        throw new Error(`Invalid ${kind} JSON file response`);
    }
    return { sha, data: JSON.parse(Buffer.from(file.content, "base64").toString("utf8")) };
}

export async function buildCatalog(config, resolver = resolveSource) {
    const catalog = validateCatalog(config);
    const archive = Object.create(null);
    const cache = new Map();
    let current;
    let hasPreviews = false;
    for (const entry of catalog.entries) {
        const sources = {};
        const data = {};
        for (const [kind, repo] of Object.entries(SCHEMA_REPOS)) {
            const pin = entry[kind];
            const key = `${kind}:${JSON.stringify(pin)}`;
            if (!cache.has(key)) cache.set(key, resolver(kind, pin));
            const resolved = await cache.get(key);
            if (!SHA.test(resolved.sha)) throw new Error(`Invalid resolved ${kind} SHA`);
            data[kind] = resolved.data;
            sources[kind] = {
                ...pin,
                sha: resolved.sha,
                url: pin.tag
                    ? `https://github.com/${repo}/tree/${encodeURIComponent(pin.tag)}`
                    : `https://github.com/${repo}/pull/${pin.pr}`,
            };
        }
        const { checklist, principles } = data;
        const version = checklist?.checklist_version ?? checklist?.version;
        if (typeof version !== "string" || !VERSION.test(version) || !principles || !VERSION.test(principles.version)) {
            throw new Error(`Schemas must declare versions for ${entry.id}`);
        }
        if (checklist.principles_version !== principles.version)
            throw new Error(`Principles version does not match checklist ${entry.id}`);
        if (Object.hasOwn(checklist, "_preview")) throw new Error("Upstream checklist cannot set preview metadata");
        const preview = !!(entry.checklist.sha || entry.principles.sha);
        if (!preview && entry.id !== version)
            throw new Error(`Checklist version does not match released entry ${entry.id}`);
        const id = preview ? `${version}-preview.${sources.checklist.sha}.${sources.principles.sha}` : version;
        if (Object.hasOwn(archive, id)) throw new Error(`Duplicate assessment identity: ${id}`);
        const bundle = {
            checklist: preview ? { ...checklist, _preview: { id, version, label: entry.id, sources } } : checklist,
            principles,
        };
        archive[id] = bundle;
        if (entry.id === catalog.default) current = bundle;
        hasPreviews ||= preview;
    }
    return { archive, current, hasPreviews };
}
