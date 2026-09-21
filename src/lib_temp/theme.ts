// ---------------------------------------------------------------------------
// Theme system — zero-dependency dark/light mode + system preference.
//
// Design goals (Nepal context):
//   - No external packages. Uses CSS variables + localStorage only.
//   - Respects OS-level prefers-color-scheme so users who never toggle
//     still get a comfortable default (critical for low-literacy users).
//   - Persists the user's explicit choice so it survives reloads — vital
//     for users on flaky connections who may reload mid-session.
//   - SSR-safe: getInitialTheme() defaults to "light" when window is absent.
//   - "system" mode is re-evaluated on the fly via a media-query listener,
//     so switching OS theme mid-session updates the page automatically.
//   - NEVER touches PDF generation, validation, or MICR safety logic.
//     Theme is purely client-side CSS class toggling.
// ---------------------------------------------------------------------------

export type Theme = "light" | "dark" | "system";
const THEME_KEY = "chequePrintTheme";
const STORAGE_KEY = THEME_KEY;

/** Read the raw stored preference, falling back to "system". */
export function getStoredTheme(): Theme {
  if (typeof window === "undefined" || !window.localStorage) return "system";
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark" || saved === "system") return saved;
  } catch {
    // ignore
  }
  return "system";
}

/** Resolve "system" to a concrete light/dark based on the OS preference. */
export function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme === "light") return "light";
  if (theme === "dark") return "dark";
  // system
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return "light";
}

/** Concrete resolved theme for the current stored preference. SSR-safe. */
export function getInitialTheme(): "light" | "dark" {
  return resolveTheme(getStoredTheme());
}

/**
 * Apply a resolved (light|dark) theme to the documentElement.
 * Sets data-theme attribute (which globals.css [data-theme="dark"] targets).
 */
export function applyTheme(resolved: "light" | "dark") {
  document.documentElement.setAttribute("data-theme", resolved);
}

/** Persist + apply a theme preference. */
export function setTheme(theme: Theme) {
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // ignore
  }
  applyTheme(resolveTheme(theme));
}

/** Subscribe to OS-level preference changes when in "system" mode. */
export function watchSystemTheme(onChange: (resolved: "light" | "dark") => void): () => void {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = (e: MediaQueryListEvent) => onChange(e.matches ? "dark" : "light");
  mq.addEventListener("change", handler);
  return () => mq.removeEventListener("change", handler);
}
