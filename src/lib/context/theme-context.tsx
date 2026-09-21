"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  toggleTheme: () => {},
  isDark: false,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem("nga-admin-theme");
      if (saved === "dark") {
        setTheme("dark");
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem("nga-admin-theme", theme);
    } catch {}
  }, [theme, mounted]);

  // Put theme + staff-panel flags on <html> so portaled modals, sheets,
  // and dropdowns inherit dark-mode styles and the single-scroll layout.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("nga-staff-panel");
    root.classList.toggle("admin-dark", theme === "dark");
    root.style.colorScheme = theme === "dark" ? "dark" : "light";
    return () => {
      root.classList.remove("nga-staff-panel", "admin-dark");
      root.style.colorScheme = "";
    };
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === "light" ? "dark" : "light"));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === "dark" }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
