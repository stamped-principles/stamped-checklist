import { withTheme } from "./utils.js";

function buildReasonInput(value = "") {
    const container = document.createElement("div");
    container.className = "response-ui";
    container.style.maxWidth = "560px";

    const reasonText = String(value);
    container.innerHTML = `
        <textarea
            class="reason-input visible"
            placeholder="Reason for not meeting requirement..."
            rows="2"
            maxlength="250"
        >${reasonText}</textarea>
        <div class="reason-counter visible">${reasonText.length}/250</div>
    `;

    return container;
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

export const EmptyDark = {
    name: "Reason input (empty, dark mode)",
    render: () => withTheme(buildReasonInput(""), "dark"),
};
