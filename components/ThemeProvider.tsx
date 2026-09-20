"use client";
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { getInitialTheme, getStoredTheme, setTheme, resolveTheme, watchSystemTheme, type Theme } from "@/lib/theme";

const STORAGE_KEY = "chequePrintTheme";

const ThemeToggleContext = createContext<{
  resolved: "light" | "dark";
  stored: Theme;
  setStored: (theme: Theme) => void;
  cycleTheme: () => void;
} | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [resolved, setResolved] = useState<"light" | "dark">(getInitialTheme());
  const [stored, setStoredState] = useState<Theme>(getStoredTheme());

  useEffect(() => {
    const unsubscribe = watchSystemTheme((next) => {
      if (stored === "system") setResolved(next);
    });
    return unsubscribe;
  }, [stored]);

  const setStored = useCallback((theme: Theme) => {
    setTheme(theme);
    setStoredState(theme);
    setResolved(resolveTheme(theme));
  }, []);

  const cycleTheme = useCallback(() => {
    const currentIndex = ["light", "dark", "system"].indexOf(stored);
    const nextIndex = (currentIndex + 1) % 3;
    const next = ["light", "dark", "system"][nextIndex] as Theme;
    setStored(next);
  }, [stored, setStored]);

  return (
    <ThemeToggleContext.Provider value={{ resolved, stored, setStored, cycleTheme }}>
      {children}
    </ThemeToggleContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeToggleContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
