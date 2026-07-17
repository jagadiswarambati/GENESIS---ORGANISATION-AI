"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type Theme = "dark" | "light" | "system";
type ResolvedTheme = Exclude<Theme, "system">;

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
};

const STORAGE_KEY = "genesis-theme";
const DEFAULT_THEME: Theme = "dark";
const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme !== "system") return theme;

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({
  children,
}: Readonly<{ children: React.ReactNode }>): React.ReactNode {
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("dark");

  const applyTheme = useCallback((nextTheme: Theme) => {
    const resolved = resolveTheme(nextTheme);
    document.documentElement.dataset.theme = resolved;
    setResolvedTheme(resolved);
  }, []);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
    const nextTheme =
      savedTheme === "dark" || savedTheme === "light" || savedTheme === "system"
        ? savedTheme
        : DEFAULT_THEME;
    setThemeState(nextTheme);
  }, []);

  useEffect(() => {
    applyTheme(theme);
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemChange = () => {
      if (theme === "system") applyTheme("system");
    };

    mediaQuery.addEventListener("change", handleSystemChange);
    return () => mediaQuery.removeEventListener("change", handleSystemChange);
  }, [applyTheme, theme]);

  const setTheme = useCallback(
    (nextTheme: Theme) => {
      window.localStorage.setItem(STORAGE_KEY, nextTheme);
      setThemeState(nextTheme);
      applyTheme(nextTheme);
    },
    [applyTheme],
  );

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [resolvedTheme, setTheme, theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside ThemeProvider.");
  return context;
}
