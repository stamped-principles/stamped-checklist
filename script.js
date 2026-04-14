const DATA = [
    {
        level: "must",
        label: "MUST",
        principles: [
            {
                code: "S.1",
                name: "Self-containment",
                desc: "All modules and components essential to replicate computational execution MUST be reachable within a single top-level research object.",
                items: [
                    "Are all files and directories nested under a common root?",
                    "Are datasets included, linked, or referenced reachable from the code and environment specifications without crossing the boundary of a common root?",
                    "Is external software included in the environment or linked as submodules within the project boundary?",
                ],
            },
            {
                code: "T.1 + T.3",
                name: "Tracking",
                desc: "Persistent content identification MUST be recorded for all components. Provenance of all modifications MUST be recorded.",
                items: [
                    "Are version control systems such as <code>Git</code> used for code, text, documentation, and configuration files?",
                    "Are version control systems such as <code>git-annex</code>, DataLad, or <code>Git</code> LFS used for large binary data?",
                    "Are the exact environment specifications used to generate a set of results included in the provenance records to link computational actions to particular environments?",
                ],
            },
            {
                code: "A.1",
                name: "Actionability",
                desc: "The research object MUST contain sufficient instructions to reproduce all computational results.",
                items: [
                    "Is a <code>README.md</code> or <code>Makefile</code> included with instructions for installation and usage?",
                    "Is there a clear starting point for users to start reproducing results (e.g., a main script, a workflow definition, or a container image)?",
                ],
            },
            {
                code: "P.1",
                name: "Portability",
                desc: "Procedures MUST NOT depend on undocumented host environment state.",
                items: [
                    "Are relative paths used in scripts, avoiding hardcoded or system-specific paths like <code>C:\\Users\\...</code> or <code>/home/user/...</code>?",
                    "Are all software dependencies included in the environment specification, rather than relying on pre-installed tools?",
                    "Have all assumptions about the host system's configuration been documented (e.g., specific OS versions, required system libraries, or environment variables)?",
                ],
            },
            {
                code: "P.2",
                name: "Portability",
                desc: "Computational environments MUST be explicitly specified.",
                items: [
                    "Is there a clear list of system requirements and dependencies documented in the README or environment specifications?",
                ],
            },
            {
                code: "P.3",
                name: "Portability",
                desc: "Environment definitions MUST be version controlled.",
                items: [
                    "Are environment specifications (e.g., Dockerfiles, <code>pyproject.toml</code>, <code>package.json</code>) included in the version control system alongside code and data?",
                    "Is there a process for updating environment specifications when dependencies change, and are these updates tracked in version control?",
                ],
            },
            {
                code: "D.1",
                name: "Distributability",
                desc: "All referenced modules and components MUST be persistently retrievable by others.",
                items: [
                    "Are environment specifications (e.g., container digests, frozen package manifests) included to ensure others can attempt to exactly replicate the environment?",
                    "Are environment specifications shared in a way that others can access and use them (e.g., published container images, archived environment files)?",
                    "Is there documentation on how to obtain and use the environment specifications for reproduction?",
                ],
            },
        ],
    },
    {
        level: "should",
        label: "SHOULD",
        principles: [
            {
                code: "T.2",
                name: "Tracking",
                desc: "All components SHOULD be tracked using the same content-addressed version control system.",
                items: [
                    "Is a common version control system (e.g., <code>Git</code>, DVC, <code>git-annex</code>, or DataLad) used across all components?",
                ],
            },
            {
                code: "A.2",
                name: "Actionability",
                desc: "Procedures SHOULD be specified as executable specifications.",
                items: ["Is the workflow tested regularly to ensure instructions remain accurate?"],
            },
            {
                code: "M.1",
                name: "Modularity",
                desc: "Components SHOULD be organized in a modular structure.",
                items: [
                    "Are raw data, processed data, code, and environment definitions separated into distinct modules?",
                ],
            },
            {
                code: "E.1",
                name: "Ephemerality",
                desc: "Computational results SHOULD be produced in ephemeral environments.",
                items: [
                    "Is the pipeline tested in a fresh container, batch job, clean virtual machine, or cloud-based instance?",
                    "Does the workflow spawn disposable environments for each execution, allowing for isolation of runs?",
                ],
            },
            {
                code: "D.2",
                name: "Distributability",
                desc: "Environment specifications SHOULD support reproducible builds.",
                items: [
                    "Are the exact environment specifications used to generate a specific set of results regularly tested to ensure they can be reconstituted as intended?",
                    "Are environment artifacts archived within the research object where possible (e.g., executable binaries, container images)?",
                    "Is there a process for updating environment specifications when dependencies change, and are these updates tracked in version control?",
                ],
            },
        ],
    },
    {
        level: "may",
        label: "MAY",
        principles: [
            {
                code: "M.2",
                name: "Modularity",
                desc: "Components MAY be included directly or linked as subdatasets.",
                items: [
                    "Are external datasets or software dependencies included as submodules or linked as submodules?",
                    "Is the modular structure documented to clarify how components relate and can be recombined?",
                    "Are modular boundaries defined in a way that allows independent updates without breaking the overall workflow?",
                    "Is there a clear mechanism for composing modules together (e.g., <code>git</code> submodules, or container orchestration)?",
                    "Is there documentation or tooling to support users in understanding and navigating the modular structure?",
                ],
            },
        ],
    },
];

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
