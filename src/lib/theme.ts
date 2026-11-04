/**
 * Colour theme: follow the system (the default), or a light or dark choice saved on this device.
 *
 * The choice lives in localStorage under THEME_KEY. A small script in <head> (themeScript) applies it
 * before the first paint, so a saved dark theme never flashes light. CSS does the rest: the dark
 * tokens apply when the system is dark and the reader hasn't picked light, or when they picked dark.
 */

export const THEME_KEY = "tensorwire:theme";

export const THEMES = ["light", "dark", "system"] as const;
export type Theme = (typeof THEMES)[number];

/** Browser UI colour (address bar on mobile) for each theme: the masthead colour. */
export const THEME_COLOR = { light: "#101735", dark: "#0A0F22" } as const;

export function isSaved(value: unknown): value is "light" | "dark" {
  return value === "light" || value === "dark";
}

/**
 * Runs in <head> during parsing. Only "light" or "dark" are ever written to the page, so a
 * tampered storage value can't inject anything. It also points the theme-color tags at the
 * chosen theme when they are already in the document (the switch repeats this after hydration).
 */
export const themeScript = `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_KEY)});if(t!=="light"&&t!=="dark")return;var d=document.documentElement;d.setAttribute("data-theme",t);var c=t==="dark"?${JSON.stringify(THEME_COLOR.dark)}:${JSON.stringify(THEME_COLOR.light)};document.querySelectorAll('meta[name="theme-color"]').forEach(function(m){m.setAttribute("content",c)})}catch(e){}})()`;
