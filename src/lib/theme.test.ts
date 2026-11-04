import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { THEME_COLOR, THEME_KEY, isSaved, themeScript } from "./theme";

const css = readFileSync(join(__dirname, "../app/globals.css"), "utf8");

function block(selector: string): string {
  const start = css.indexOf(`${selector} {`);
  expect(start, `${selector} block`).toBeGreaterThan(-1);
  const body = css.slice(start + selector.length + 2, css.indexOf("}", start));
  return body.replace(/\s+/g, " ").trim();
}

/** Runs the head script against a fake page and returns what it did. */
function runScript(saved: string | null, { storageThrows = false } = {}) {
  const attributes: Record<string, string> = {};
  const metas = [0, 1].map(() => {
    const meta = {
      content: "#000",
      setAttribute(name: string, value: string) {
        if (name === "content") meta.content = value;
      },
    };
    return meta;
  });
  const localStorage = {
    getItem(key: string) {
      if (storageThrows) throw new Error("blocked");
      return key === THEME_KEY ? saved : null;
    },
  };
  const document = {
    documentElement: { setAttribute: (name: string, value: string) => (attributes[name] = value) },
    querySelectorAll: () => metas,
  };
  new Function("localStorage", "document", themeScript)(localStorage, document);
  return { theme: attributes["data-theme"], colors: metas.map((m) => m.content) };
}

describe("theme", () => {
  it("keeps the system-dark and chosen-dark colour blocks identical", () => {
    const system = block(':root:not([data-theme="light"])');
    const chosen = block(':root[data-theme="dark"]');
    expect(system).toContain("--paper:");
    expect(system).toContain("color-scheme: dark");
    expect(chosen).toBe(system);
  });

  it("keeps dark colours off paper when printing", () => {
    expect(css).toContain('@media screen and (prefers-color-scheme: dark) {\n  :root:not([data-theme="light"])');
    expect(css).toContain('@media screen {\n  :root[data-theme="dark"]');
  });

  it("applies a saved light or dark theme and the matching browser colour", () => {
    expect(runScript("dark")).toEqual({ theme: "dark", colors: [THEME_COLOR.dark, THEME_COLOR.dark] });
    expect(runScript("light")).toEqual({ theme: "light", colors: [THEME_COLOR.light, THEME_COLOR.light] });
  });

  it("follows the system when nothing valid is saved or storage is blocked", () => {
    for (const saved of [null, "system", "", "dark;}body{display:none", '"><script>']) {
      expect(runScript(saved), String(saved)).toEqual({ theme: undefined, colors: ["#000", "#000"] });
    }
    expect(runScript("dark", { storageThrows: true }).theme).toBeUndefined();
  });

  it("recognises only light and dark as saved choices", () => {
    expect(isSaved("light")).toBe(true);
    expect(isSaved("dark")).toBe(true);
    expect(isSaved("system")).toBe(false);
    expect(isSaved("DARK")).toBe(false);
  });
});
