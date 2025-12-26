import { initApp } from "./source/index.js";

function $(sel, root = document) { return root.querySelector(sel); }

function setTheme(theme) {
  const html = document.documentElement;
  const isDark = theme === "dark";
  html.classList.toggle("dark", isDark);
  localStorage.setItem("theme", theme);

  const icon = $("#themeIcon");
  icon.innerHTML = isDark
    ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" class="opacity-90">
         <path d="M21 13.2A8.4 8.4 0 0 1 10.8 3a7.3 7.3 0 1 0 10.2 10.2Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>
       </svg>`
    : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" class="opacity-90">
         <path d="M12 3v2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
         <path d="M12 19v2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
         <path d="M4.2 4.2l1.4 1.4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
         <path d="M18.4 18.4l1.4 1.4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
         <path d="M3 12h2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
         <path d="M19 12h2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
         <path d="M4.2 19.8l1.4-1.4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
         <path d="M18.4 5.6l1.4-1.4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
         <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" stroke="currentColor" stroke-width="1.7"/>
       </svg>`;
}

function initTheme() {
  const saved = localStorage.getItem("theme");
  const theme = saved === "light" ? "light" : "dark"; // default dark
  setTheme(theme);

  $("#themeToggle").addEventListener("click", () => {
    const current = document.documentElement.classList.contains("dark") ? "dark" : "light";
    setTheme(current === "dark" ? "light" : "dark");
  });
}

initTheme();
initApp();
