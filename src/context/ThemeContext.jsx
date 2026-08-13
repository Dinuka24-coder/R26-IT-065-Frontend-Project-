import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);

export const THEMES = {
  dark: {
    bg: "#0a0f1a", sidebar: "#0d1424", card: "#111a2e",
    border: "rgba(255,255,255,0.08)", text: "#e8edf5",
    dim: "#7a8aa3", navText: "#94a3b8",
    accent: "#2563eb", accentSoft: "rgba(37,99,235,0.15)",
    grid: "rgba(255,255,255,0.05)",
  },
  light: {
    bg: "#f1f5f9", sidebar: "#0d1424", card: "#ffffff",
    border: "#e2e8f0", text: "#0f172a",
    dim: "#64748b", navText: "#94a3b8",
    accent: "#2563eb", accentSoft: "rgba(37,99,235,0.10)",
    grid: "#e2e8f0",
  },
};

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => localStorage.getItem("pulmo_theme") !== "light");

  useEffect(() => {
    localStorage.setItem("pulmo_theme", dark ? "dark" : "light");
    document.body.style.background = dark ? THEMES.dark.bg : THEMES.light.bg;
  }, [dark]);

  const t = dark ? THEMES.dark : THEMES.light;

  return (
    <ThemeContext.Provider value={{ t, dark, toggle: () => setDark((d) => !d) }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
