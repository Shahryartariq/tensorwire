"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";

import {
  READER_FONT_KEY,
  READER_SIZE_KEY,
  READER_SIZES,
  type ReaderFont,
  type ReaderSize,
} from "@/lib/theme";

import { ThemeSwitch } from "./ThemeSwitch";

const listeners = new Set<() => void>();

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function readSize(): ReaderSize {
  const saved = read(READER_SIZE_KEY);
  return (READER_SIZES as readonly string[]).includes(saved ?? "") ? (saved as ReaderSize) : "m";
}

function readFont(): ReaderFont {
  return read(READER_FONT_KEY) === "sans" ? "sans" : "serif";
}

/** Mirrors the saved preferences onto <html>, where the reader styles look for them. */
function apply() {
  const root = document.documentElement;
  const size = readSize();
  const font = readFont();
  if (size === "m") root.removeAttribute("data-reader-size");
  else root.setAttribute("data-reader-size", size);
  if (font === "serif") root.removeAttribute("data-reader-font");
  else root.setAttribute("data-reader-font", font);
}

function save(key: string, value: string, isDefault: boolean) {
  try {
    if (isDefault) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Storage can be blocked; the change still applies to this page.
  }
  if (isDefault) document.documentElement.removeAttribute(key === READER_SIZE_KEY ? "data-reader-size" : "data-reader-font");
  else document.documentElement.setAttribute(key === READER_SIZE_KEY ? "data-reader-size" : "data-reader-font", value);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== READER_SIZE_KEY && event.key !== READER_FONT_KEY) return;
    apply();
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const noop = () => () => {};
const SIZE_NAMES: Record<ReaderSize, string> = { s: "small", m: "medium", l: "large", xl: "extra large" };

/**
 * Reader view settings: text size, typeface and colour theme. Saved on this device and applied
 * before the first paint on the next visit. Hidden until hydrated, because they need JavaScript.
 */
export function ReaderControls() {
  const size = useSyncExternalStore(subscribe, readSize, () => "m" as ReaderSize);
  const font = useSyncExternalStore(subscribe, readFont, () => "serif" as ReaderFont);
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  const index = READER_SIZES.indexOf(size);

  // React's development remount clears attributes the head script set on <html>; put them back.
  useLayoutEffect(apply, []);

  const setSize = (next: ReaderSize) => save(READER_SIZE_KEY, next, next === "m");
  const setFont = (next: ReaderFont) => save(READER_FONT_KEY, next, next === "serif");

  return (
    <div className="reader-controls" data-ready={hydrated || undefined}>
      <div className="reader-size" role="group" aria-label="Text size">
        <button
          type="button"
          onClick={() => setSize(READER_SIZES[index - 1])}
          disabled={index === 0}
          aria-label="Smaller text"
          title="Smaller text"
        >
          <span aria-hidden="true" className="reader-size-small">
            A
          </span>
        </button>
        <span className="visually-hidden" aria-live="polite">
          Text size {SIZE_NAMES[size]}
        </span>
        <button
          type="button"
          onClick={() => setSize(READER_SIZES[index + 1])}
          disabled={index === READER_SIZES.length - 1}
          aria-label="Larger text"
          title="Larger text"
        >
          <span aria-hidden="true" className="reader-size-large">
            A
          </span>
        </button>
      </div>
      <fieldset className="reader-font">
        <legend className="visually-hidden">Typeface</legend>
        {(["serif", "sans"] as const).map((value) => (
          <label key={value} title={value === "serif" ? "Serif typeface" : "Sans-serif typeface"}>
            <input
              type="radio"
              name="reader-font"
              value={value}
              checked={font === value}
              onChange={() => setFont(value)}
              className="visually-hidden"
            />
            <span aria-hidden="true" className={`reader-font-sample is-${value}`}>
              Aa
            </span>
            <span className="visually-hidden">{value === "serif" ? "Serif" : "Sans-serif"}</span>
          </label>
        ))}
      </fieldset>
      <ThemeSwitch tone="paper" />
    </div>
  );
}
