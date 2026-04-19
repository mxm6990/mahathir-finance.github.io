(() => {
  const rootEl = document.documentElement;
  const STORAGE_KEY = "site-theme";

  function getPreferredTheme() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "light" || saved === "dark") return saved;
    } catch (_) {}

    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) {
      return "light";
    }
    return "dark";
  }

  function setTheme(theme) {
    rootEl.dataset.theme = theme;
<<<<<<< HEAD
    // Bootstrap 5.3 color mode (form controls, tables) on pages that load Bootstrap
    rootEl.setAttribute("data-bs-theme", theme === "light" ? "light" : "dark");
=======
>>>>>>> 5ff1ce74b54c27d68adbefbd3d282bfce9b58062

    const btn = document.getElementById("themeToggle");
    if (btn) btn.textContent = theme === "dark" ? "Light mode" : "Dark mode";

    window.dispatchEvent(
      new CustomEvent("site-theme-changed", {
        detail: { theme }
      })
    );
  }

  function toggleTheme() {
    const current = rootEl.dataset.theme === "light" ? "light" : "dark";
    const next = current === "light" ? "dark" : "light";
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch (_) {}
    setTheme(next);
  }

  // Initialize
  setTheme(getPreferredTheme());

  // Hook up toggle button (id is the same across pages)
  const wireUp = () => {
    const btn = document.getElementById("themeToggle");
    if (!btn) return false;
    btn.addEventListener("click", toggleTheme);
    return true;
  };

  // If the script runs after DOMContentLoaded (edge case), wire immediately.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wireUp);
  } else {
    wireUp();
  }
})();

