"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Theme = "light" | "dark";
type ThemeMode = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

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

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");

  useEffect(() => {
    const stored = localStorage.getItem("theme") as ThemeMode | null;
    const mode =
      stored && ["light", "dark", "system"].includes(stored) ? (stored as ThemeMode) : "system";
    const resolved = applyTheme(mode);
    setThemeState(resolved);
    setThemeMode(mode);
  }, []);

  const setTheme = (mode: ThemeMode) => {
    localStorage.setItem("theme", mode);
    const resolved = applyTheme(mode);
    setThemeMode(mode);
    setThemeState(resolved);
  };

  const toggleTheme = () => {
    const newMode: ThemeMode = themeMode === "dark" ? "light" : "dark";
    setTheme(newMode);
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (themeMode === "system") {
        const resolved = applyTheme("system");
        setThemeState(resolved);
      }
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [themeMode]);

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
