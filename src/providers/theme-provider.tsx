"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";

type Theme = "light" | "dark";
type ThemeMode = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = "theme";
const VALID_MODES: ThemeMode[] = ["light", "dark", "system"];

function getSystemTheme(): Theme {
  if (typeof window !== "undefined") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return "light";
}

function applyTheme(mode: ThemeMode): Theme {
  const html = document.documentElement;
  if (mode === "system") {
    const systemTheme = getSystemTheme();
    html.classList.toggle("dark", systemTheme === "dark");
    return systemTheme;
  }
  html.classList.toggle("dark", mode === "dark");
  return mode;
}

function getStoredThemeMode(): ThemeMode {
  if (typeof window === "undefined") return "system";
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && VALID_MODES.includes(stored as ThemeMode)) {
      return stored as ThemeMode;
    }
  } catch {}
  return "system";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");

  useEffect(() => {
    const mode = getStoredThemeMode();
    const resolved = applyTheme(mode);
    setThemeState(resolved);
    setThemeMode(mode);
  }, []);

  useEffect(() => {
    if (themeMode !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      const resolved = applyTheme("system");
      setThemeState(resolved);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [themeMode]);

  const setTheme = useCallback((mode: ThemeMode) => {
    localStorage.setItem(STORAGE_KEY, mode);
    const resolved = applyTheme(mode);
    setThemeMode(mode);
    setThemeState(resolved);
  }, []);

  const toggleTheme = useCallback(() => {
    const newMode: ThemeMode = theme === "dark" ? "light" : "dark";
    setTheme(newMode);
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, themeMode, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}

export function ThemeScript({}: { locale?: string }) {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
(function() {
  try {
    var stored = localStorage.getItem('${STORAGE_KEY}');
    var mode = stored && ${JSON.stringify(VALID_MODES)}.includes(stored) ? stored : 'system';
    if (mode === 'system') {
      var isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (isDark) { document.documentElement.classList.add('dark'); }
    } else if (mode === 'dark') {
      document.documentElement.classList.add('dark');
    }
  } catch(e) {}
})();
`,
      }}
    />
  );
}
