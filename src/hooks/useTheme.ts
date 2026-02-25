import { useState, useEffect, useCallback } from "react";

type Theme = "light" | "dark" | "system";
type AccentColor = "teal" | "blue" | "purple" | "orange" | "pink";

interface ThemeConfig {
  theme: Theme;
  accentColor: AccentColor;
}

const THEME_STORAGE_KEY = "smartdesign_theme";

const accentColors: Record<AccentColor, { primary: string; accent: string }> = {
  teal: { primary: "173 58% 39%", accent: "12 76% 61%" },
  blue: { primary: "217 91% 60%", accent: "199 89% 48%" },
  purple: { primary: "262 83% 58%", accent: "280 65% 60%" },
  orange: { primary: "25 95% 53%", accent: "38 92% 50%" },
  pink: { primary: "330 81% 60%", accent: "340 75% 55%" },
};

export function useTheme() {
  const [config, setConfig] = useState<ThemeConfig>(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return { theme: "light", accentColor: "teal" };
  });

  const applyTheme = useCallback((theme: Theme) => {
    const root = document.documentElement;
    
    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
      root.classList.remove("light", "dark");
      root.classList.add(systemTheme);
    } else {
      root.classList.remove("light", "dark");
      root.classList.add(theme);
    }
  }, []);

  const applyAccentColor = useCallback((accent: AccentColor) => {
    const root = document.documentElement;
    const colors = accentColors[accent];
    root.style.setProperty("--primary", colors.primary);
    root.style.setProperty("--accent", colors.accent);
  }, []);

  useEffect(() => {
    applyTheme(config.theme);
    applyAccentColor(config.accentColor);
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(config));
  }, [config, applyTheme, applyAccentColor]);

  // Listen for system theme changes
  useEffect(() => {
    if (config.theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [config.theme, applyTheme]);

  const setTheme = useCallback((theme: Theme) => {
    setConfig((prev) => ({ ...prev, theme }));
  }, []);

  const setAccentColor = useCallback((accentColor: AccentColor) => {
    setConfig((prev) => ({ ...prev, accentColor }));
  }, []);

  const resolvedTheme = config.theme === "system"
    ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : config.theme;

  return {
    theme: config.theme,
    accentColor: config.accentColor,
    resolvedTheme,
    setTheme,
    setAccentColor,
    availableAccents: Object.keys(accentColors) as AccentColor[],
  };
}
