let checkboxStates = {};
let totalItems = 0;

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

function generateId(sectionIdx, principleIdx, itemIdx) {
    return `s${sectionIdx}_p${principleIdx}_i${itemIdx}`;
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

            const header = document.createElement("div");
            header.className = "principle-header";
            header.innerHTML = `
        <span class="level-badge ${section.level}">${section.label}</span>
        <span class="principle-code">${principle.code}</span>
        <div style="flex:1">
          <div class="principle-title">${principle.name}</div>
          <div style="font-size:0.76rem; color:var(--text-light); margin-top:0.1rem;">${principle.desc}</div>
        </div>
        <span class="principle-count" id="count_${si}_${pi}">0/${numItems}</span>
      `;
            card.appendChild(header);

            const checklist = document.createElement("div");
            checklist.className = "checklist";

            principle.items.forEach((item, ii) => {
                const id = generateId(si, pi, ii);
                totalItems++;
                checkboxStates[id] = false;

                const checkItem = document.createElement("div");
                checkItem.className = "check-item";
                checkItem.innerHTML = `
          <input type="checkbox" id="${id}" onchange="handleCheck('${id}')">
          <label for="${id}">
            <span class="checkbox-custom">✓</span>
            <span class="check-text">${item}</span>
          </label>
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
}

function handleCheck(id) {
    const cb = document.getElementById(id);
    checkboxStates[id] = cb.checked;
    updateAllCounts();
    autoSave();
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
                if (checkboxStates[id]) checked++;
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
    document.getElementById("progressText").textContent = `${totalChecked} / ${total} items checked (${pct}%)`;
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
    localStorage.setItem("stamped_checklist", JSON.stringify(getState()));
    showToast("💾 Progress saved to browser");
}

function loadFromLocalStorage() {
    const data = localStorage.getItem("stamped_checklist");
    if (data) {
        try {
            setState(JSON.parse(data));
        } catch (e) {}
    }
}

function autoSave() {
    localStorage.setItem("stamped_checklist", JSON.stringify(getState()));
}

// URL Sharing
function shareURL() {
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
    const url = window.location.origin + window.location.pathname + "?state=" + encodeURIComponent(encoded);

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
    if (!stateParam) return;

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
        // Clean URL
        window.history.replaceState({}, "", window.location.pathname);
    } catch (e) {
        console.warn("Could not load state from URL", e);
    }
}

// Reset
function confirmReset() {
    if (confirm("Are you sure you want to reset all checkboxes? This cannot be undone.")) {
        Object.keys(checkboxStates).forEach((id) => {
            checkboxStates[id] = false;
            const cb = document.getElementById(id);
            if (cb) cb.checked = false;
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

// Build on load
buildChecklist();
