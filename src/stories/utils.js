export function withTheme(element, theme) {
    const wrapper = document.createElement("div");
    wrapper.setAttribute("data-theme", theme);
    wrapper.style.padding = "0.5rem";
    wrapper.style.background = "var(--bg)";
    wrapper.appendChild(element);
    return wrapper;
}
