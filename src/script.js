import {
    VERSION,
    DATA,
    DEFAULT_VERSION,
    ORIGINAL_VERSION,
    AVAILABLE_VERSIONS,
    selectChecklist,
    checklistData,
} from "./checklist.js";
import { PERSISTENCE_FORMAT, readResponses, readLegacyState, translateResponses } from "./persistence.js";

let responseStates = {};
let totalItems = 0;
let stableIds = new Map();
let persistenceBlocked = false;
let versionUnavailable = false;
const THEME_KEY = "stamped_theme";
const VALID_COLUMN_VALUES = new Set(["1", "2", "auto"]);
const VALID_SECTION_VALUES = new Set(["on", "off"]);
const MAX_REASON_LENGTH = 250;

function normalizeReason(value) {
    return String(value || "").slice(0, MAX_REASON_LENGTH);
}

function updateReasonCounter(id, reasonValue = "") {
    const counterEl = document.getElementById(`reason_count_${id}`);
    if (counterEl) {
        const len = normalizeReason(reasonValue).length;
        counterEl.textContent = `${len}/${MAX_REASON_LENGTH}`;
        counterEl.classList.toggle("warn", len > MAX_REASON_LENGTH / 2 && len < MAX_REASON_LENGTH);
        counterEl.classList.toggle("limit", len === MAX_REASON_LENGTH);
    }
}

function autoResizeTextarea(el) {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
}

function escapeHtml(text) {
    return String(text)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function renderInlineMarkdown(text) {
    // Match inline code spans delimited by backticks.
    return String(text)
        .split(/(`[^`]*`)/g)
        .map((part) => {
            if (part.startsWith("`") && part.endsWith("`")) {
                const innerText = part.slice(1, -1);
                return `<code>${escapeHtml(innerText)}</code>`;
            }
            return escapeHtml(part);
        })
        .join("");
}

function savedVersion(saved) {
    return saved.checklist_version ?? ORIGINAL_VERSION;
}

function requestedVersion() {
    const params = new URLSearchParams(window.location.search);
    if (params.has("checklist")) return params.get("checklist");
    if (params.has("state") || params.has("responses") || params.has("format")) return ORIGINAL_VERSION;
    return DEFAULT_VERSION;
}

function storageKey() {
    return `stamped_checklist:${VERSION}`;
}

function writeSavedAssessment() {
    // Preserve the previous assessment before changing the last-opened pointer,
    // including old saves that predate the per-version storage keys.
    const previous = localStorage.getItem("stamped_checklist");
    if (previous) {
        try {
            const parsed = JSON.parse(previous);
            const key = `stamped_checklist:${savedVersion(parsed)}`;
            if (!localStorage.getItem(key)) localStorage.setItem(key, previous);
        } catch {
            /* Unreadable saves are handled when loading the assessment. */
        }
    }
    const saved = JSON.stringify({
        format: PERSISTENCE_FORMAT,
        checklist_version: VERSION,
        responses: savedResponses(),
    });
    localStorage.setItem(storageKey(), saved);
    // Retain the compatibility save alongside the per-version assessments.
    localStorage.setItem("stamped_checklist", saved);
}

function encodeResponses(version, responses) {
    const bytes = new TextEncoder().encode(JSON.stringify({ checklist_version: version, responses }));
    return btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(""));
}

function openAssessment(version, responses, sourceVersion = version) {
    const params = new URLSearchParams(window.location.search);
    params.delete("state");
    params.delete("responses");
    params.set("checklist", version);
    params.set("format", String(PERSISTENCE_FORMAT));
    params.set("responses_version", sourceVersion);
    params.set("responses", encodeResponses(sourceVersion, responses));
    window.history.replaceState({}, "", `${window.location.pathname}?${params}`);
    buildChecklist();
}

function selectChecklistVersion(version) {
    if (persistenceBlocked) {
        updateVersionDisplay();
        return;
    }
    const responses = savedResponses();
    const sourceVersion = VERSION;
    writeSavedAssessment();
    openAssessment(version, responses, sourceVersion);
}

function updateVersionDisplay() {
    const versionEl = document.getElementById("version-indicator");
    if (versionEl) versionEl.textContent = `Checklist v${VERSION}`;
    const select = document.getElementById("checklist-version");
    if (select) {
        select.replaceChildren(
            ...AVAILABLE_VERSIONS.map((version) => {
                const option = document.createElement("option");
                option.value = version;
                option.textContent = version;
                option.selected = version === VERSION;
                return option;
            })
        );
    }
}

function savedResponses() {
    return Object.fromEntries(
        [...stableIds].flatMap(([domId, stableId]) => {
            const response = responseStates[domId];
            return response.value !== null || response.reason ? [[stableId, response]] : [];
        })
    );
}

function restoreResponses(responses) {
    for (const [domId, stableId] of stableIds) {
        responseStates[domId] = responses[stableId] || { value: null, reason: "" };
        applyResponseState(domId);
    }
    updateAllCounts();
}

function reportPersistenceError(error) {
    persistenceBlocked = true;
    console.warn("Could not restore saved checklist answers", error);
    showToast("Saved answers could not be restored. Original data kept; reset to start a new assessment.");
}

function getSelectedOrDefaultView(name, validValues, fallback) {
    const saved = localStorage.getItem(`stamped_${name}`);
    if (saved && validValues.has(saved)) return saved;
    const selected = document.querySelector(`input[name="${name}"]:checked`)?.value;
    if (selected && validValues.has(selected)) return selected;
    return fallback;
}

function syncPersistentURL() {
    if (persistenceBlocked) return;
    const params = new URLSearchParams();
    params.set("checklist", VERSION);
    params.set("responses_version", VERSION);

    params.set("cols", getSelectedOrDefaultView("cols", VALID_COLUMN_VALUES, "auto"));
    params.set("sections", getSelectedOrDefaultView("sections", VALID_SECTION_VALUES, "off"));
    params.set("format", String(PERSISTENCE_FORMAT));
    // Always include responses, even when empty, so a shared blank assessment
    // does not inherit unrelated answers from the recipient's browser.
    params.set("responses", encodeResponses(VERSION, savedResponses()));
    window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
}

function setColumns(value, shouldSyncURL = true) {
    const grids = document.querySelectorAll(".cards-grid");
    grids.forEach((g) => {
        g.classList.remove("cols-1", "cols-2", "cols-auto");
        g.classList.add(`cols-${value}`);
    });
    try {
        localStorage.setItem("stamped_cols", String(value));
        if (shouldSyncURL) syncPersistentURL();
    } catch (e) {}
}

function loadColumnPreference() {
    const urlColumns = new URLSearchParams(window.location.search).get("cols");
    const columns = urlColumns && VALID_COLUMN_VALUES.has(urlColumns) ? urlColumns : "auto";
    const radio = document.querySelector(`input[name="cols"][value="${columns}"]`);
    if (radio) {
        radio.checked = true;
        setColumns(columns, false);
    }
}

function setSections(value, shouldSyncURL = true) {
    const container = document.getElementById("app");
    if (value === "off") {
        container.classList.add("flat-mode");
    } else {
        container.classList.remove("flat-mode");
    }
    try {
        localStorage.setItem("stamped_sections", String(value));
        if (shouldSyncURL) syncPersistentURL();
    } catch (e) {}
}

function loadSectionsPreference() {
    const saved = localStorage.getItem("stamped_sections") || "off";
    const radio = document.querySelector(`input[name="sections"][value="${saved}"]`);
    if (radio) {
        radio.checked = true;
        setSections(saved, false);
    }
}

function enableResponseMode() {
    const container = document.getElementById("app");
    container.classList.add("mode-responses");
    updateAllCounts();
}

function loadModePreference() {
    enableResponseMode();
}

function getPreferredTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme === "light" || savedTheme === "dark") return savedTheme;
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
    return "light";
}

function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    const toggle = document.getElementById("theme-toggle");
    if (toggle) {
        const isDark = theme === "dark";
        toggle.textContent = isDark ? "🌙" : "☀️";
        toggle.setAttribute("aria-pressed", String(isDark));
        toggle.setAttribute("title", isDark ? "Switch to light mode" : "Switch to dark mode");
    }
}

function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme");
    const nextTheme = current === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
    try {
        localStorage.setItem(THEME_KEY, nextTheme);
    } catch (e) {}
}

function setupThemeToggle() {
    const toggle = document.getElementById("theme-toggle");
    if (toggle) toggle.onclick = toggleTheme;
    applyTheme(getPreferredTheme());
}

function setupPrintTitle() {
    const originalTitle = document.title;
    window.addEventListener("beforeprint", () => {
        document.title = "";
    });
    window.addEventListener("afterprint", () => {
        document.title = originalTitle;
    });
}

function generateId(sectionIdx, principleIdx, itemIdx) {
    return `s${sectionIdx}_p${principleIdx}_i${itemIdx}`;
}

function getPrincipleExamplesURL(principle) {
    const match = (principle.name || "").match(/[A-Za-z]/);
    const firstLetter = match ? match[0].toLowerCase() : "";
    return `https://stamped-principles.github.io/stamped-examples/stamped_principles/${firstLetter}/`;
}

function buildChecklist() {
    responseStates = {};
    stableIds = new Map();
    totalItems = 0;
    persistenceBlocked = false;
    const container = document.getElementById("app");
    container.querySelector(".cards-grid")?.remove();
    container.querySelector(".version-error")?.remove();
    container.querySelector(".transfer-summary")?.remove();
    versionUnavailable = false;
    try {
        selectChecklist(requestedVersion());
        updateVersionDisplay();
    } catch (error) {
        persistenceBlocked = true;
        versionUnavailable = true;
        const notice = document.createElement("div");
        notice.className = "version-error";
        notice.setAttribute("role", "alert");
        const message = document.createElement("p");
        message.textContent = `${error.message} The saved assessment has not been changed.`;
        const link = document.createElement("a");
        link.href = `?checklist=${encodeURIComponent(DEFAULT_VERSION)}`;
        link.textContent = "Open the current checklist";
        notice.append(message, link);
        container.append(notice);
        return;
    }

    const cardsGrid = document.createElement("div");
    cardsGrid.className = "cards-grid";

    DATA.forEach((section, si) => {
        const sectionDivider = document.createElement("div");
        sectionDivider.className = "section-divider";
        sectionDivider.setAttribute("data-level", section.level);
        sectionDivider.innerHTML = `
      <span class="section-badge ${section.level}">${section.label}</span>
      <span style="font-weight:600; font-size:0.95rem;">${
          section.level === "must" ? "Required" : section.level === "should" ? "Recommended" : "Optional"
      } Requirements</span>
      <span class="section-progress" id="sectionProgress_${si}"></span>
    `;
        cardsGrid.appendChild(sectionDivider);

        section.principles.forEach((principle, pi) => {
            const card = document.createElement("div");
            card.className = `principle-card ${section.level}`;
            card.id = `card_${si}_${pi}`;

            const numItems = principle.items.length;
            const examplesURL = getPrincipleExamplesURL(principle);
            const principleName = escapeHtml(principle.name);
            const principleDescription = renderInlineMarkdown(principle.desc);

            const header = document.createElement("div");
            header.className = "principle-header";
            header.innerHTML = `
        <div class="principle-header-main">
          <span class="level-badge ${section.level}">${section.label}</span>
          <span class="principle-code">${principle.code}</span>
          <div class="principle-heading">
            <div class="principle-title-row">
              <div class="principle-title">${principleName}</div>
              <a
                class="principle-examples-link"
                href="${examplesURL}"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="View ${principleName} examples"
                title="View examples for ${principleName}"
              >💡</a>
            </div>
          </div>
          <span class="principle-count" id="count_${si}_${pi}">0/${numItems}</span>
        </div>
        <div class="principle-description">${principleDescription}</div>
      `;
            card.appendChild(header);

            const checklist = document.createElement("div");
            checklist.className = "checklist";

            principle.items.forEach((item, ii) => {
                const id = generateId(si, pi, ii);
                stableIds.set(id, principle.itemIds[ii]);
                const itemText = renderInlineMarkdown(item);
                totalItems++;
                responseStates[id] = { value: null, reason: "" };

                const checkItem = document.createElement("div");
                checkItem.className = "check-item";
                checkItem.innerHTML = `
          <div class="response-ui">
            <div class="response-row">
              <span class="check-text">${itemText}</span>
              <div class="response-btns">
                <button type="button" class="response-btn yes-btn" id="yes_${id}" onclick="handleResponse('${id}', 'yes')">✓ Yes</button>
                <button type="button" class="response-btn no-btn" id="no_${id}" onclick="handleResponse('${id}', 'no')">✗ No</button>
              </div>
            </div>
            <textarea class="reason-input" id="reason_${id}" placeholder="Reason for not meeting requirement..." rows="1" maxlength="${MAX_REASON_LENGTH}" oninput="handleReason('${id}', this.value)"></textarea>
            <div class="reason-counter" id="reason_count_${id}">0/${MAX_REASON_LENGTH}</div>
          </div>
        `;
                checklist.appendChild(checkItem);
            });

            card.appendChild(checklist);
            cardsGrid.appendChild(card);
        });
    });

    container.appendChild(cardsGrid);

    // Enable response mode before loading state so that .response-ui is visible
    // when applyResponseState calls autoResizeTextarea (display:none parent yields
    // scrollHeight=0, which would collapse all reason textareas on load).
    loadModePreference();
    // Check before loadFromURL canonicalizes the URL, including view-only links.
    const params = new URLSearchParams(window.location.search);
    if (!params.has("state") && !params.has("responses") && !params.has("format")) {
        loadFromLocalStorage();
    }
    loadFromURL();
    updateAllCounts();
    loadColumnPreference();
    loadSectionsPreference();
    syncPersistentURL();
}

function handleResponse(id, value) {
    const current = responseStates[id].value;
    responseStates[id].value = current === value ? null : value;

    const yesBtn = document.getElementById(`yes_${id}`);
    const noBtn = document.getElementById(`no_${id}`);
    const reasonEl = document.getElementById(`reason_${id}`);

    if (yesBtn) yesBtn.classList.toggle("active", responseStates[id].value === "yes");
    if (noBtn) noBtn.classList.toggle("active", responseStates[id].value === "no");
    if (reasonEl) {
        const showReason = responseStates[id].value === "no";
        reasonEl.classList.toggle("visible", showReason);
        const counterEl = document.getElementById(`reason_count_${id}`);
        if (counterEl) counterEl.classList.toggle("visible", showReason);
        const isDeselectingNo = current === "no" && responseStates[id].value === null;
        if (isDeselectingNo) {
            responseStates[id].reason = "";
            reasonEl.value = "";
            updateReasonCounter(id, "");
        }
        if (showReason) autoResizeTextarea(reasonEl);
    }

    updateAllCounts();
    autoSave();
}

function handleReason(id, value) {
    const normalizedValue = normalizeReason(value);
    responseStates[id].reason = normalizedValue;
    const reasonEl = document.getElementById(`reason_${id}`);
    if (reasonEl && reasonEl.value !== normalizedValue) {
        reasonEl.value = normalizedValue;
    }
    autoResizeTextarea(reasonEl);
    updateReasonCounter(id, normalizedValue);
    autoSave();
}

function applyResponseState(id) {
    const state = responseStates[id];
    if (!state) return;
    const yesBtn = document.getElementById(`yes_${id}`);
    const noBtn = document.getElementById(`no_${id}`);
    const reasonEl = document.getElementById(`reason_${id}`);
    if (yesBtn) yesBtn.classList.toggle("active", state.value === "yes");
    if (noBtn) noBtn.classList.toggle("active", state.value === "no");
    if (reasonEl) {
        reasonEl.classList.toggle("visible", state.value === "no");
        state.reason = normalizeReason(state.reason);
        reasonEl.value = state.reason;
        updateReasonCounter(id, state.reason);
        autoResizeTextarea(reasonEl);
    }
    const counterEl = document.getElementById(`reason_count_${id}`);
    if (counterEl) {
        counterEl.classList.toggle("visible", state.value === "no");
    }
}

function renderLevelStats(levelStats, totalStats) {
    const container = document.getElementById("levelStats");
    if (!container) return;

    const fragment = document.createDocumentFragment();
    const allEntries = [["total", { label: "Total", ...totalStats }], ...Object.entries(levelStats)];
    allEntries.forEach(([level, { label, passing, failing, total }]) => {
        const incomplete = total - passing - failing;
        const passingPctRounded = total > 0 ? Math.round((passing / total) * 100) : 0;
        const passingPctRaw = total > 0 ? (passing / total) * 100 : 0;
        const failingPctRaw = total > 0 ? (failing / total) * 100 : 0;
        const incompletePctRaw = total > 0 ? (incomplete / total) * 100 : 100;

        const row = document.createElement("div");
        row.className = "level-stat-row";
        row.setAttribute("data-level-stat", level);

        const badge = document.createElement("span");
        badge.className = `section-badge ${level}`;
        badge.textContent = label;
        row.appendChild(badge);

        const barContainer = document.createElement("div");
        barContainer.className = "level-stat-bar-container";

        const bar = document.createElement("div");
        bar.className = "level-stat-bar";

        const passSegment = document.createElement("div");
        passSegment.className = "progress-segment pass";
        passSegment.style.width = `${passingPctRaw}%`;
        bar.appendChild(passSegment);

        const failSegment = document.createElement("div");
        failSegment.className = "progress-segment fail";
        failSegment.style.width = `${failingPctRaw}%`;
        bar.appendChild(failSegment);

        const incompleteSegment = document.createElement("div");
        incompleteSegment.className = "progress-segment incomplete";
        incompleteSegment.style.width = `${incompletePctRaw}%`;
        bar.appendChild(incompleteSegment);

        barContainer.appendChild(bar);
        row.appendChild(barContainer);

        const counts = document.createElement("span");
        counts.className = "level-stat-counts";
        counts.setAttribute(
            "aria-label",
            `${passing} passing, ${failing} failing, ${incomplete} incomplete, ${passingPctRounded}% passing`
        );

        const passSpan = document.createElement("span");
        passSpan.className = "pass";
        passSpan.textContent = `${passing}✓`;
        counts.appendChild(passSpan);

        const failSpan = document.createElement("span");
        failSpan.className = "fail";
        failSpan.textContent = `${failing}✗`;
        counts.appendChild(failSpan);

        const incompleteSpan = document.createElement("span");
        incompleteSpan.className = "incomplete";
        incompleteSpan.textContent = `${incomplete}?`;
        counts.appendChild(incompleteSpan);

        const pctSpan = document.createElement("span");
        pctSpan.className = "level-stat-pct";
        pctSpan.textContent = `${passingPctRounded}%`;
        counts.appendChild(pctSpan);

        row.appendChild(counts);
        fragment.appendChild(row);
    });

    container.replaceChildren(fragment);
}

function updateAllCounts() {
    const totalItems = DATA.flatMap((section) => section.principles).flatMap((principle) => principle.items).length;
    let totalPassing = 0;
    let totalFailing = 0;

    const levelStats = {};
    DATA.forEach((section) => {
        if (!levelStats[section.level]) {
            levelStats[section.level] = { label: section.label, passing: 0, failing: 0, total: 0 };
        }
    });

    DATA.forEach((section, si) => {
        let sectionChecked = 0;
        let sectionFailing = 0;
        let sectionTotal = 0;

        section.principles.forEach((principle, pi) => {
            let checked = 0;
            let failed = false;
            const numItems = principle.items.length;

            principle.items.forEach((_, ii) => {
                const id = generateId(si, pi, ii);
                const responseValue = responseStates[id] && responseStates[id].value;
                if (responseValue === "yes") {
                    checked++;
                    totalPassing++;
                }
                if (responseValue === "no") {
                    failed = true;
                    totalFailing++;
                    sectionFailing++;
                }
            });

            const countEl = document.getElementById(`count_${si}_${pi}`);
            countEl.textContent = `${checked}/${numItems}`;
            countEl.className = `principle-count${checked === numItems ? " done" : failed ? " failed" : ""}`;

            const card = document.getElementById(`card_${si}_${pi}`);
            if (checked === numItems) {
                card.classList.add("complete");
            } else {
                card.classList.remove("complete");
            }

            sectionChecked += checked;
            sectionTotal += numItems;
        });

        const sp = document.getElementById(`sectionProgress_${si}`);
        const sectionPct = sectionTotal > 0 ? Math.round((sectionChecked / sectionTotal) * 100) : 0;
        sp.textContent = `${sectionChecked}/${sectionTotal} (${sectionPct}%)`;

        levelStats[section.level].passing += sectionChecked;
        levelStats[section.level].failing += sectionFailing;
        levelStats[section.level].total += sectionTotal;
    });

    renderLevelStats(levelStats, { passing: totalPassing, failing: totalFailing, total: totalItems });
}

function getState() {
    return Object.fromEntries(
        Object.entries(responseStates).map(([id, state]) => [id, state && state.value === "yes"])
    );
}

function setState(state) {
    Object.keys(state).forEach((id) => {
        if (id in responseStates) {
            responseStates[id].value = state[id] ? "yes" : null;
            responseStates[id].reason = "";
            applyResponseState(id);
        }
    });
    updateAllCounts();
}

// Local Storage
function saveToLocalStorage() {
    if (persistenceBlocked) return;
    writeSavedAssessment();
    showToast("💾 Progress saved to browser");
}

function loadFromLocalStorage() {
    const data = localStorage.getItem(storageKey()) || localStorage.getItem("stamped_checklist");
    if (data) {
        try {
            const parsed = JSON.parse(data);
            if (parsed && parsed.responses !== undefined && savedVersion(parsed) === VERSION) {
                if (parsed.format === undefined && VERSION !== ORIGINAL_VERSION)
                    throw new Error("Positional answers require the original checklist");
                restoreResponses(readResponses(parsed.responses, parsed.format, DATA));
            }
            updateAllCounts();
        } catch (e) {
            reportPersistenceError(e);
        }
    }
}

function autoSave() {
    if (persistenceBlocked) return;
    writeSavedAssessment();
    syncPersistentURL();
}

function checkRadioByValue(name, value) {
    const radio = Array.from(document.querySelectorAll(`input[name="${name}"]`)).find((input) => input.value === value);
    if (radio) radio.checked = true;
}

function loadFromURL() {
    const params = new URLSearchParams(window.location.search);
    const stateParam = params.get("state");
    const responsesParam = params.get("responses");
    const colsParam = params.get("cols");
    const sectionsParam = params.get("sections");
    const validColsParam = colsParam && VALID_COLUMN_VALUES.has(colsParam) ? colsParam : null;
    const validSectionsParam = sectionsParam && VALID_SECTION_VALUES.has(sectionsParam) ? sectionsParam : null;

    if (!params.has("state") && !params.has("responses") && !params.has("format") && !colsParam && !sectionsParam)
        return;

    if (params.has("state") || params.has("responses") || params.has("format")) {
        try {
            const format = params.has("format") ? Number(params.get("format")) : undefined;
            let decoded;
            let encodedVersion;
            if (responsesParam !== null) {
                const binary = atob(responsesParam);
                const json =
                    format === 2 || format === PERSISTENCE_FORMAT
                        ? new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)))
                        : binary;
                decoded = JSON.parse(json);
                if (format === PERSISTENCE_FORMAT) {
                    if (!decoded || typeof decoded.checklist_version !== "string")
                        throw new Error("Missing encoded checklist version");
                    encodedVersion = decoded.checklist_version;
                    decoded = decoded.responses;
                }
            } else if (format !== undefined) {
                throw new Error("Missing responses for saved-answer format");
            }
            const sourceVersion =
                params.get("responses_version") ?? encodedVersion ?? params.get("checklist") ?? ORIGINAL_VERSION;
            if (encodedVersion && encodedVersion !== sourceVersion)
                throw new Error("Response version disagrees with encoded answers");
            if (format === undefined && sourceVersion !== ORIGINAL_VERSION)
                throw new Error("Positional answers require the original checklist");
            const sourceData = checklistData(sourceVersion);
            let responses = {};
            if (format === undefined && stateParam !== null) responses = readLegacyState(atob(stateParam), sourceData);
            if (responsesParam !== null) responses = { ...responses, ...readResponses(decoded, format, sourceData) };
            if (sourceVersion !== VERSION) {
                const translated = translateResponses(responses, sourceData, DATA);
                showTransferSummary(sourceVersion, responses, translated);
                responses = translated;
            }
            restoreResponses(responses);
        } catch (e) {
            reportPersistenceError(e);
        }
    }

    if (validColsParam) {
        checkRadioByValue("cols", validColsParam);
        setColumns(validColsParam, false);
    }

    if (validSectionsParam) {
        checkRadioByValue("sections", validSectionsParam);
        setSections(validSectionsParam, false);
    }

    syncPersistentURL();
}

function showTransferSummary(sourceVersion, source, translated) {
    const answered = (responses) => Object.values(responses).filter((response) => response.value !== null).length;
    const carried = answered(translated);
    const omitted = answered(source) - carried;
    const summary = document.createElement("p");
    summary.className = "transfer-summary";
    summary.setAttribute("role", "status");
    summary.textContent = `From checklist ${sourceVersion}: answers carried over: ${carried}; questions unanswered: ${
        totalItems - carried
    }; answers omitted: ${omitted}. Scores use checklist ${VERSION}.`;
    document.getElementById("app").prepend(summary);
}

// Reset
function confirmReset() {
    if (versionUnavailable) return;
    if (
        confirm(
            "Reset responses and start a blank assessment on the latest checklist? This clears saved answers for the latest version."
        )
    ) {
        openAssessment(DEFAULT_VERSION, {});
        autoSave();
        showToast("🗑️ Checklist reset");
    }
}

// Toast
function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2500);
}

export {
    setColumns,
    loadColumnPreference,
    setSections,
    loadSectionsPreference,
    enableResponseMode,
    loadModePreference,
    generateId,
    buildChecklist,
    handleResponse,
    handleReason,
    applyResponseState,
    updateAllCounts,
    renderLevelStats,
    getState,
    setState,
    saveToLocalStorage,
    loadFromLocalStorage,
    autoSave,
    loadFromURL,
    confirmReset,
    selectChecklistVersion,
    showToast,
    updateHeaderHeight,
    init,
};

function updateHeaderHeight() {
    const header = document.querySelector(".header");
    const toolbar = document.querySelector(".toolbar");
    const headerHeight = header ? header.offsetHeight : 0;
    const toolbarHeight = toolbar ? toolbar.offsetHeight : 0;
    document.documentElement.style.setProperty("--header-height", `${headerHeight}px`);
    document.documentElement.style.setProperty("--toolbar-offset", `${headerHeight + toolbarHeight}px`);
}

function init() {
    setupThemeToggle();
    setupPrintTitle();
    buildChecklist();

    const versionEl = document.getElementById("version-indicator");
    if (versionEl && !versionUnavailable) versionEl.textContent = `Checklist v${VERSION}`;

    updateHeaderHeight();
    if (typeof ResizeObserver !== "undefined") {
        // The observers intentionally run for the page lifetime; no cleanup needed.
        const ro = new ResizeObserver(updateHeaderHeight);
        const header = document.querySelector(".header");
        const toolbar = document.querySelector(".toolbar");
        if (header) ro.observe(header);
        if (toolbar) ro.observe(toolbar);
    }
}

// Expose functions to the global scope for inline DOM event handlers in index.html
// and in elements created by buildChecklist(). ES modules do not pollute the global
// scope automatically, so we assign them to window explicitly.
if (typeof window !== "undefined") {
    Object.assign(window, {
        selectChecklistVersion,
        saveToLocalStorage,
        confirmReset,
        setColumns,
        setSections,
        handleResponse,
        handleReason,
    });
}

// Auto-initialize only in browser context outside of tests
if (!import.meta.env?.VITEST && document.getElementById("app")) {
    init();
}
