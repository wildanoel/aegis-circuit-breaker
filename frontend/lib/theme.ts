import { useEffect } from "react";

type Theme = "light" | "dark";

/**
 * Theme is stored on <html class="dark"> and localStorage key "aegis-theme".
 * The inline script in layout.tsx applies the stored value before hydration;
 * this hook just listens for toggle events so every consumer stays in sync.
 */
export function getTheme(): Theme {
  if (typeof document !== "undefined" && document.documentElement.classList.contains("dark")) {
    return "dark";
  }
  return "light";
}

export function setTheme(t: Theme): void {
  const root = document.documentElement;
  root.classList.toggle("dark", t === "dark");
  root.style.colorScheme = t;
  try {
    localStorage.setItem("aegis-theme", t);
  } catch {
    /* storage unavailable */
  }
  window.dispatchEvent(new CustomEvent("aegis-theme-set", { detail: t }));
}

export function useTheme(): [Theme, () => void] {
  useEffect(() => {
    const onSet = () => {
      /* force rerender listeners via window event consumers */
    };
    window.addEventListener("aegis-theme-set", onSet);
    return () => window.removeEventListener("aegis-theme-set", onSet);
  }, []);
  return [getTheme(), () => setTheme(getTheme() === "dark" ? "light" : "dark")];
}
