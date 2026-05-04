import { withTheme } from "./utils.js";

const MAX_REASON_LENGTH = 250;

function autoResizeTextarea(el) {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
}

function buildReasonInput(value = "") {
    const app = document.createElement("div");
    app.id = "app";
    app.className = "mode-responses";

    const container = document.createElement("div");
    container.className = "response-ui";
    container.style.maxWidth = "560px";

    const reasonText = String(value);
    container.innerHTML = `
        <textarea
            class="reason-input visible"
            placeholder="Reason for not meeting requirement..."
            rows="1"
            maxlength="${MAX_REASON_LENGTH}"
        >${reasonText}</textarea>
        <div class="reason-counter visible">${reasonText.length}/${MAX_REASON_LENGTH}</div>
    `;

    const textarea = container.querySelector(".reason-input");
    const counter = container.querySelector(".reason-counter");
    if (textarea && counter) {
        const updateCounter = (len) => {
            counter.textContent = `${len}/${MAX_REASON_LENGTH}`;
            counter.classList.toggle("warn", len > MAX_REASON_LENGTH / 2 && len < MAX_REASON_LENGTH);
            counter.classList.toggle("limit", len === MAX_REASON_LENGTH);
        };
        textarea.addEventListener("input", () => {
            autoResizeTextarea(textarea);
            updateCounter(textarea.value.length);
        });
        // Set initial counter color and height
        updateCounter(reasonText.length);
        // Defer initial resize until the element is in the DOM
        requestAnimationFrame(() => autoResizeTextarea(textarea));
    }
    app.appendChild(container);
    return app;
}

export default {
    title: "Components/ReasonInput",
};

export const Empty = {
    name: "Reason input (empty)",
    render: () => buildReasonInput(""),
};

export const NearLimit = {
    name: "Reason input (near limit)",
    render: () => buildReasonInput("x".repeat(240)),
};

export const AtLimit = {
    name: "Reason input (at limit)",
    render: () => buildReasonInput("x".repeat(250)),
};

export const EmptyDark = {
    name: "Reason input (empty, dark mode)",
    render: () => withTheme(buildReasonInput(""), "dark"),
};
