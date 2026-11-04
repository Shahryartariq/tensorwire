"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";

import { THEME_COLOR, THEME_KEY, isSaved, type Theme } from "@/lib/theme";

const listeners = new Set<() => void>();

function readTheme(): Theme {
  try {
    const saved = window.localStorage.getItem(THEME_KEY);
    return isSaved(saved) ? saved : "system";
  } catch {
    return "system";
  }
}

/** Puts the theme on <html> and points the browser's theme-color at it. */
function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
    const forDark = theme === "dark" || (theme === "system" && (meta.media ?? "").includes("dark"));
    meta.content = forDark ? THEME_COLOR.dark : THEME_COLOR.light;
  });
}

function saveTheme(theme: Theme) {
  try {
    if (theme === "system") window.localStorage.removeItem(THEME_KEY);
    else window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Storage can be blocked; the theme still changes for this page.
  }
  applyTheme(theme);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // A choice made in another tab applies here too.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== THEME_KEY && event.key !== null) return;
    applyTheme(readTheme());
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const noop = () => () => {};

const OPTIONS: { value: Theme; label: string; icon: React.ReactNode }[] = [
  {
    value: "light",
    label: "Light",
    icon: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" />
      </>
    ),
  },
  {
    value: "dark",
    label: "Dark",
    icon: <path d="M20 14.6A8.2 8.2 0 0 1 9.4 4a8.2 8.2 0 1 0 10.6 10.6Z" />,
  },
  {
    value: "system",
    label: "System",
    icon: (
      <>
        <rect x="3" y="4.5" width="18" height="12" rx="1.6" />
        <path d="M8.5 20h7M12 16.5V20" />
      </>
    ),
  },
];

/**
 * Light, dark or system theme, as a radio group: arrow keys move between the options, and screen
 * readers announce "Theme, radio group". Hidden until hydrated, because it can't work without JavaScript.
 */
export function ThemeSwitch({ tone = "band" }: { tone?: "band" | "paper" }) {
  const theme = useSyncExternalStore(subscribe, readTheme, () => "system" as Theme);
  const hydrated = useSyncExternalStore(noop, () => true, () => false);

  // React's development remount clears attributes the head script set on <html>; put them back
  // before paint. In production this repeats what the script did, and also sets theme-color tags
  // that were added after the script ran.
  useLayoutEffect(() => {
    applyTheme(readTheme());
  }, []);

  return (
    <fieldset className={tone === "paper" ? "theme-switch is-paper" : "theme-switch"} data-ready={hydrated || undefined}>
      <legend className="visually-hidden">Theme</legend>
      {OPTIONS.map((option) => (
        <label key={option.value} title={`${option.label} theme`}>
          <input
            type="radio"
            name="theme"
            value={option.value}
            checked={theme === option.value}
            onChange={() => saveTheme(option.value)}
            className="visually-hidden"
          />
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
            {option.icon}
          </svg>
          <span className="visually-hidden">{option.label}</span>
        </label>
      ))}
    </fieldset>
  );
}
