import { VERSION, DATA } from "./checklist.js";
import { GA_MEASUREMENT_ID } from "./analytics.js";

let checkboxStates = {};
let responseStates = {};
let currentMode = "checkboxes";
let totalItems = 0;
const COOKIE_CONSENT_KEY = "stamped_cookie_consent";
const COOKIE_CONSENT_ACCEPTED = "accepted";
const COOKIE_CONSENT_DECLINED = "declined";
let analyticsInitialized = false;

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
        .split(/(`[^`]+`)/g)
        .map((part) => {
            if (part.startsWith("`") && part.endsWith("`") && part.length > 1) {
                return `<code>${escapeHtml(part.slice(1, -1))}</code>`;
            }
            return escapeHtml(part);
        })
        .join("");
}

function setColumns(value) {
    const grids = document.querySelectorAll(".cards-grid");
    grids.forEach((g) => {
        g.classList.remove("cols-1", "cols-2", "cols-auto");
        g.classList.add(`cols-${value}`);
    });
    try {
        localStorage.setItem("stamped_cols", String(value));
    } catch (e) {}
}

function loadColumnPreference() {
    const saved = localStorage.getItem("stamped_cols") || "auto";
    const radio = document.querySelector(`input[name="cols"][value="${saved}"]`);
    if (radio) {
        radio.checked = true;
        setColumns(saved);
    }
}

function setSections(value) {
    const container = document.getElementById("app");
    if (value === "off") {
        container.classList.add("flat-mode");
    } else {
        container.classList.remove("flat-mode");
    }
    try {
        localStorage.setItem("stamped_sections", String(value));
    } catch (e) {}
}

function loadSectionsPreference() {
    const saved = localStorage.getItem("stamped_sections") || "off";
    const radio = document.querySelector(`input[name="sections"][value="${saved}"]`);
    if (radio) {
        radio.checked = true;
        setSections(saved);
    }
}

function setMode(value) {
    currentMode = value;
    const container = document.getElementById("app");
    if (value === "responses") {
        container.classList.add("mode-responses");
    } else {
        container.classList.remove("mode-responses");
    }
    updateAllCounts();
    try {
        localStorage.setItem("stamped_mode", value);
    } catch (e) {}
}

function loadModePreference() {
    const saved = localStorage.getItem("stamped_mode") || "checkboxes";
    const radio = document.querySelector(`input[name="mode"][value="${saved}"]`);
    if (radio) {
        radio.checked = true;
        setMode(saved);
    }
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
    const container = document.getElementById("app");

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
        <span class="level-badge ${section.level}">${section.label}</span>
        <span class="principle-code">${principle.code}</span>
        <div style="flex:1">
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
          <div style="font-size:0.76rem; color:var(--text-light); margin-top:0.1rem;">${principleDescription}</div>
        </div>
        <span class="principle-count" id="count_${si}_${pi}">0/${numItems}</span>
      `;
            card.appendChild(header);

            const checklist = document.createElement("div");
            checklist.className = "checklist";

            principle.items.forEach((item, ii) => {
                const id = generateId(si, pi, ii);
                const itemText = renderInlineMarkdown(item);
                totalItems++;
                checkboxStates[id] = false;
                responseStates[id] = { value: null, reason: "" };

                const checkItem = document.createElement("div");
                checkItem.className = "check-item";
                checkItem.innerHTML = `
          <input type="checkbox" id="${id}" onchange="handleCheck('${id}')">
          <label for="${id}">
            <span class="checkbox-custom">✓</span>
            <span class="check-text">${itemText}</span>
          </label>
          <div class="response-ui">
            <div class="response-row">
              <span class="check-text">${itemText}</span>
              <div class="response-btns">
                <button type="button" class="response-btn yes-btn" id="yes_${id}" onclick="handleResponse('${id}', 'yes')">✓ Yes</button>
                <button type="button" class="response-btn no-btn" id="no_${id}" onclick="handleResponse('${id}', 'no')">✗ No</button>
              </div>
            </div>
            <textarea class="reason-input" id="reason_${id}" placeholder="Reason for not meeting requirement..." rows="2" oninput="handleReason('${id}', this.value)"></textarea>
          </div>
        `;
                checklist.appendChild(checkItem);
            });

            card.appendChild(checklist);
            cardsGrid.appendChild(card);
        });
    });

    container.appendChild(cardsGrid);

    loadFromURL();
    loadFromLocalStorage();
    updateAllCounts();
    loadColumnPreference();
    loadSectionsPreference();
    loadModePreference();
}

function handleCheck(id) {
    const cb = document.getElementById(id);
    checkboxStates[id] = cb.checked;
    cb.closest(".check-item").classList.toggle("checked", cb.checked);
    updateAllCounts();
    autoSave();
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
        if (!showReason) {
            responseStates[id].reason = "";
            reasonEl.value = "";
        }
    }

    updateAllCounts();
    autoSave();
}

function handleReason(id, value) {
    responseStates[id].reason = value;
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
        reasonEl.value = state.reason || "";
    }
}

function updateAllCounts() {
    let totalChecked = 0;
    let total = 0;

    DATA.forEach((section, si) => {
        let sectionChecked = 0;
        let sectionTotal = 0;

        section.principles.forEach((principle, pi) => {
            let checked = 0;
            const numItems = principle.items.length;

            principle.items.forEach((_, ii) => {
                const id = generateId(si, pi, ii);
                const isChecked =
                    currentMode === "checkboxes"
                        ? checkboxStates[id]
                        : responseStates[id] && responseStates[id].value === "yes";
                if (isChecked) checked++;
            });

            const countEl = document.getElementById(`count_${si}_${pi}`);
            countEl.textContent = `${checked}/${numItems}`;
            countEl.className = `principle-count${checked === numItems ? " done" : ""}`;

            const card = document.getElementById(`card_${si}_${pi}`);
            if (checked === numItems) {
                card.classList.add("complete");
            } else {
                card.classList.remove("complete");
            }

            sectionChecked += checked;
            sectionTotal += numItems;
            totalChecked += checked;
            total += numItems;
        });

        const sp = document.getElementById(`sectionProgress_${si}`);
        sp.textContent = `${sectionChecked}/${sectionTotal}`;
    });

    const pct = total > 0 ? Math.round((totalChecked / total) * 100) : 0;
    document.getElementById("progressBar").style.width = pct + "%";
    const modeLabel = currentMode === "responses" ? "meeting requirements" : "checked";
    document.getElementById("progressText").textContent = `${totalChecked} / ${total} items ${modeLabel} (${pct}%)`;
}

function getState() {
    return { ...checkboxStates };
}

function setState(state) {
    Object.keys(state).forEach((id) => {
        if (id in checkboxStates) {
            checkboxStates[id] = !!state[id];
            const cb = document.getElementById(id);
            if (cb) cb.checked = !!state[id];
        }
    });
    updateAllCounts();
}

// Local Storage
function saveToLocalStorage() {
    localStorage.setItem(
        "stamped_checklist",
        JSON.stringify({ checkboxes: checkboxStates, responses: responseStates })
    );
    showToast("💾 Progress saved to browser");
}

function loadFromLocalStorage() {
    const data = localStorage.getItem("stamped_checklist");
    if (data) {
        try {
            const parsed = JSON.parse(data);
            if (parsed && parsed.checkboxes !== undefined) {
                // New format
                Object.keys(parsed.checkboxes || {}).forEach((id) => {
                    if (id in checkboxStates) {
                        checkboxStates[id] = !!parsed.checkboxes[id];
                        const cb = document.getElementById(id);
                        if (cb) cb.checked = !!parsed.checkboxes[id];
                    }
                });
                Object.keys(parsed.responses || {}).forEach((id) => {
                    if (id in responseStates) {
                        responseStates[id] = parsed.responses[id];
                        applyResponseState(id);
                    }
                });
            } else {
                // Old format: direct checkbox states
                setState(parsed);
            }
            updateAllCounts();
        } catch (e) {}
    }
}

function autoSave() {
    localStorage.setItem(
        "stamped_checklist",
        JSON.stringify({ checkboxes: checkboxStates, responses: responseStates })
    );
}

// URL Sharing
function shareURL() {
    // Encode checkbox states as a compact bitstring (existing format)
    const state = getState();
    const bits = [];
    DATA.forEach((section, si) => {
        section.principles.forEach((principle, pi) => {
            principle.items.forEach((_, ii) => {
                const id = generateId(si, pi, ii);
                bits.push(state[id] ? "1" : "0");
            });
        });
    });
    const encoded = btoa(bits.join(""));
    let url = window.location.origin + window.location.pathname + "?state=" + encodeURIComponent(encoded);

    // Encode non-empty response states (value + reason) as base64 JSON
    const nonEmptyResponses = {};
    Object.entries(responseStates).forEach(([id, rs]) => {
        if (rs.value !== null || rs.reason) {
            nonEmptyResponses[id] = rs;
        }
    });
    if (Object.keys(nonEmptyResponses).length > 0) {
        url += "&responses=" + encodeURIComponent(btoa(JSON.stringify(nonEmptyResponses)));
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard
            .writeText(url)
            .then(() => {
                showToast("🔗 Shareable URL copied to clipboard!");
            })
            .catch(() => {
                showPromptURL(url);
            });
    } else {
        showPromptURL(url);
    }
}

function showPromptURL(url) {
    prompt("Copy this shareable URL:", url);
}

function loadFromURL() {
    const params = new URLSearchParams(window.location.search);
    const stateParam = params.get("state");
    const responsesParam = params.get("responses");

    if (!stateParam && !responsesParam) return;

    if (stateParam) {
        try {
            const bits = atob(decodeURIComponent(stateParam)).split("");
            let idx = 0;
            const state = {};
            DATA.forEach((section, si) => {
                section.principles.forEach((principle, pi) => {
                    principle.items.forEach((_, ii) => {
                        const id = generateId(si, pi, ii);
                        state[id] = bits[idx] === "1";
                        idx++;
                    });
                });
            });
            setState(state);
        } catch (e) {
            console.warn("Could not load state from URL", e);
        }
    }

    if (responsesParam) {
        try {
            const decoded = JSON.parse(atob(decodeURIComponent(responsesParam)));
            Object.keys(decoded).forEach((id) => {
                if (id in responseStates) {
                    responseStates[id] = decoded[id];
                    applyResponseState(id);
                }
            });
            updateAllCounts();
        } catch (e) {
            console.warn("Could not load responses from URL", e);
        }
    }

    // Clean URL
    window.history.replaceState({}, "", window.location.pathname);
}

// Reset
function confirmReset() {
    if (confirm("Are you sure you want to reset all checkboxes? This cannot be undone.")) {
        Object.keys(checkboxStates).forEach((id) => {
            checkboxStates[id] = false;
            const cb = document.getElementById(id);
            if (cb) cb.checked = false;
        });
        Object.keys(responseStates).forEach((id) => {
            responseStates[id] = { value: null, reason: "" };
            applyResponseState(id);
        });
        updateAllCounts();
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

function initializeAnalytics() {
    if (analyticsInitialized) return;

    const existingScript = document.querySelector(`script[src*="${GA_MEASUREMENT_ID}"]`);
    if (!existingScript) {
        const script = document.createElement("script");
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
        document.head.appendChild(script);
    }

    window.dataLayer = window.dataLayer || [];
    window.gtag =
        window.gtag ||
        function gtag() {
            window.dataLayer.push(arguments);
        };
    window.gtag("js", new Date());
    window.gtag("config", GA_MEASUREMENT_ID);
    analyticsInitialized = true;
}

function hideCookieBanner() {
    const banner = document.getElementById("cookie-consent-banner");
    if (banner) banner.classList.add("hidden");
}

function showCookieBanner() {
    const banner = document.getElementById("cookie-consent-banner");
    if (banner) banner.classList.remove("hidden");
}

function acceptCookieConsent() {
    localStorage.setItem(COOKIE_CONSENT_KEY, COOKIE_CONSENT_ACCEPTED);
    hideCookieBanner();
    initializeAnalytics();
}

function declineCookieConsent() {
    localStorage.setItem(COOKIE_CONSENT_KEY, COOKIE_CONSENT_DECLINED);
    hideCookieBanner();
}

function setupCookieConsent() {
    const acceptButton = document.getElementById("cookie-consent-accept");
    const declineButton = document.getElementById("cookie-consent-decline");
    if (acceptButton) acceptButton.onclick = acceptCookieConsent;
    if (declineButton) declineButton.onclick = declineCookieConsent;

    if (localStorage.getItem(COOKIE_CONSENT_KEY) === COOKIE_CONSENT_ACCEPTED) {
        hideCookieBanner();
        initializeAnalytics();
    } else if (localStorage.getItem(COOKIE_CONSENT_KEY) === COOKIE_CONSENT_DECLINED) {
        hideCookieBanner();
    } else {
        showCookieBanner();
    }
}

export {
    setColumns,
    loadColumnPreference,
    setSections,
    loadSectionsPreference,
    setMode,
    loadModePreference,
    generateId,
    buildChecklist,
    handleCheck,
    handleResponse,
    handleReason,
    applyResponseState,
    updateAllCounts,
    getState,
    setState,
    saveToLocalStorage,
    loadFromLocalStorage,
    autoSave,
    shareURL,
    showPromptURL,
    loadFromURL,
    confirmReset,
    showToast,
    init,
};

function init() {
    buildChecklist();
    setupCookieConsent();

    const versionEl = document.getElementById("version-indicator");
    if (versionEl) versionEl.textContent = "v" + VERSION;
}

// Expose functions to the global scope for inline DOM event handlers in index.html
// and in elements created by buildChecklist(). ES modules do not pollute the global
// scope automatically, so we assign them to window explicitly.
if (typeof window !== "undefined") {
    Object.assign(window, {
        saveToLocalStorage,
        shareURL,
        confirmReset,
        setColumns,
        setSections,
        setMode,
        handleCheck,
        handleResponse,
        handleReason,
    });
}

// Auto-initialize only in browser context outside of tests
if (!import.meta.env?.VITEST && document.getElementById("app")) {
    init();
}
