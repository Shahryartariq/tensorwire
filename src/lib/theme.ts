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

/** Reader view text size and typeface, saved the same way and applied by the same head script. */
export const READER_SIZE_KEY = "tensorwire:reader-size";
export const READER_FONT_KEY = "tensorwire:reader-font";
export const READER_SIZES = ["s", "m", "l", "xl"] as const;
export type ReaderSize = (typeof READER_SIZES)[number];
export const READER_FONTS = ["serif", "sans"] as const;
export type ReaderFont = (typeof READER_FONTS)[number];

export function isSaved(value: unknown): value is "light" | "dark" {
  return value === "light" || value === "dark";
}

/**
 * Runs in <head> during parsing. Only known values ("light", "dark", a reader size other than the
 * default "m", or the "sans" reader font) are ever written to the page, so a tampered storage value
 * can't inject anything. It also points the theme-color tags at the
 * chosen theme when they are already in the document (the switch repeats this after hydration).
 */
export const themeScript = `(function(){var d=document.documentElement;try{var s=localStorage.getItem(${JSON.stringify(READER_SIZE_KEY)});if(${JSON.stringify(READER_SIZES)}.indexOf(s)>-1&&s!=="m")d.setAttribute("data-reader-size",s);var f=localStorage.getItem(${JSON.stringify(READER_FONT_KEY)});if(f==="sans")d.setAttribute("data-reader-font",f);var t=localStorage.getItem(${JSON.stringify(THEME_KEY)});if(t!=="light"&&t!=="dark")return;d.setAttribute("data-theme",t);var c=t==="dark"?${JSON.stringify(THEME_COLOR.dark)}:${JSON.stringify(THEME_COLOR.light)};document.querySelectorAll('meta[name="theme-color"]').forEach(function(m){m.setAttribute("content",c)})}catch(e){}})()`;
