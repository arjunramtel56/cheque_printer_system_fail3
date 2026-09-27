"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * Automatic system-based theming: the site always follows the OS/browser
 * `prefers-color-scheme` preference. There is no manual theme selection
 * and no persistence of a user-chosen theme.
 */
function applySystemTheme(): Theme {
  const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.classList.toggle("dark", isDark);
  return isDark ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");

  // Resolve the system theme after mount and keep following it live.
  useEffect(() => {
    setThemeState(applySystemTheme());

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => setThemeState(applySystemTheme());
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return <ThemeContext.Provider value={{ theme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}

/** Runs before first paint so the page renders in the system theme without flash. */
export function ThemeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
(function() {
  try {
    // Theme selection is automatic only; drop any legacy manual choice.
    localStorage.removeItem('theme');
    var isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (isDark) { document.documentElement.classList.add('dark'); }
  } catch(e) {}
})();
`,
      }}
    />
  );
}
