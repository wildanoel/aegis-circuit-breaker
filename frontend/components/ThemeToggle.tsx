"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { getTheme, setTheme } from "@/lib/theme";

export function ThemeToggle() {
  const [theme, setThemeState] = useState<"light" | "dark">("light");

  useEffect(() => {
    setThemeState(getTheme());
    const onSet = (e: Event) => setThemeState((e as CustomEvent<"light" | "dark">).detail);
    window.addEventListener("aegis-theme-set", onSet);
    return () => window.removeEventListener("aegis-theme-set", onSet);
  }, []);

  return (
    <button
      type="button"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-transparent text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
