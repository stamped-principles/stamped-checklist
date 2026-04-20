/**
 * Wraps a story element in a themed container for Storybook previews.
 * @param {HTMLElement} element - The rendered component element to wrap.
 * @param {string} theme - Theme name to apply via data-theme (e.g. "light" or "dark").
 * @returns {HTMLDivElement}
 */
export function withTheme(element, theme) {
    const wrapper = document.createElement("div");
    wrapper.setAttribute("data-theme", theme);
    wrapper.style.padding = "0.5rem";
    wrapper.style.background = "var(--bg)";
    wrapper.appendChild(element);
    return wrapper;
}
