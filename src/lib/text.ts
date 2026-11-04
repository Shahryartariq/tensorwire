import { decodeHTML } from "entities";

const TAG = /<[^>]*>/g;

/**
 * Feed text as plain text: tags removed, entities decoded, whitespace collapsed.
 * Handles the common double encoding where a description holds escaped HTML.
 * The result is rendered as text by React, never as HTML.
 */
export function plainText(input: string): string {
  if (!input) return "";
  let text = input
    .replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<(br|\/p|\/div|\/li|\/h\d)\b[^>]*>/gi, " ")
    .replace(TAG, " ");
  text = decodeHTML(text);
  if (/<\/?[a-z][^>]*>/i.test(text)) text = decodeHTML(text.replace(TAG, " "));
  return text
    .replace(/[\u0000-\u001f\u007f​﻿]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Shortens text at a word boundary and adds an ellipsis. */
export function excerpt(text: string, max = 220): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  const base = space > max * 0.6 ? cut.slice(0, space) : cut;
  return `${base.replace(/[\s,;:.\-–—(]+$/u, "")}…`;
}

const TRACKING = /^(utm_|fbclid$|gclid$|mc_cid$|mc_eid$|ref$|ref_src$|cmpid$)/i;

/** An absolute http(s) URL without tracking parameters or fragment, or null. */
export function safeUrl(raw: string | undefined, base?: string): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw.trim(), base);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.username || url.password) return null;
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) if (TRACKING.test(key)) url.searchParams.delete(key);
    return url.toString();
  } catch {
    return null;
  }
}

/** The same article reached through slightly different URLs gets the same key. */
export function urlKey(url: string): string {
  const u = new URL(url);
  const path = u.pathname.replace(/\/+$/, "") || "/";
  return `${u.hostname.replace(/^www\./, "")}${path}${u.search}`.toLowerCase();
}

/** A short, stable id (FNV-1a, base 36). */
export function hashId(value: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

const STOPWORDS = new Set(
  (
    "a an the and or but nor for of to in on at by with from into onto over under about after before " +
    "as is are was were be been being has have had do does did will would can could should may might must " +
    "it its this that these those their them they we our you your he she his her i me my not no yes so than " +
    "then too very just also only new more most all any each every some such how what when where which who why " +
    "says said say now get gets got make makes made use uses using used way ways like via up out off one two " +
    "first last year years day days week weeks month time here there s t vs ai artificial intelligence"
  ).split(" "),
);

/** Lower-case words without punctuation, stop words or plural endings, for matching headlines. */
export function tokens(text: string): string[] {
  return (
    text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/['’]s\b/g, "")
      .match(/[a-z0-9]+(?:[.-][a-z0-9]+)*/g) ?? []
  )
    .map((word) => (word.length > 4 && word.endsWith("s") && !word.endsWith("ss") ? word.slice(0, -1) : word))
    .filter((word) => word.length > 2 && !STOPWORDS.has(word));
}
