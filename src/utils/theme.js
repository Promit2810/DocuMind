const THEME_KEY = "documind_theme";

export function getTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "light" || saved === "dark") {
    return saved;
  }
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return "dark";
}

export function setTheme(theme) {
  const activeTheme = theme === "light" ? "light" : "dark";
  localStorage.setItem(THEME_KEY, activeTheme);

  if (typeof document !== "undefined") {
    const root = document.documentElement;
    root.setAttribute("data-theme", activeTheme);
    if (activeTheme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.add("light");
      root.classList.remove("dark");
    }
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("documind-theme-change", { detail: { theme: activeTheme } })
    );
  }

  return activeTheme;
}

export function toggleTheme() {
  const current = getTheme();
  return setTheme(current === "dark" ? "light" : "dark");
}

export function initTheme() {
  const theme = getTheme();
  setTheme(theme);

  if (typeof window !== "undefined" && window.matchMedia) {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e) => {
      if (!localStorage.getItem(THEME_KEY)) {
        setTheme(e.matches ? "dark" : "light");
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
    }
  }

  return theme;
}
