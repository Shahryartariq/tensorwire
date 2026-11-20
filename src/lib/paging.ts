import type { Metadata } from "next";

/** Stories per page on the front page, the topic, source and lab pages, and search. */
export const PAGE_SIZE = 50;

/**
 * The page number in `?page=`. Missing means page 1; anything that isn't a plain positive
 * number ("0", "2.5", "abc", "1e3") is not a page at all.
 */
export function readPage(value: string | string[] | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === undefined) return 1;
  return /^[1-9]\d{0,3}$/.test(raw) ? Number(raw) : null;
}

export interface Paged<T> {
  items: T[];
  page: number;
  pages: number;
  total: number;
}

/** The number of pages a list fills; an empty list still has page 1. */
export function pageCount(total: number, size = PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / size));
}

/** One page of a list, or null when the page is past the end (page 1 always exists). */
export function paginate<T>(items: T[], page: number, size = PAGE_SIZE): Paged<T> | null {
  const pages = pageCount(items.length, size);
  if (page > pages) return null;
  return { items: items.slice((page - 1) * size, page * size), page, pages, total: items.length };
}

/** The address of a page: page 1 is the plain path, so there is one URL per page. */
export function pageHref(path: string, page: number, query: Record<string, string> = {}): string {
  const params = new URLSearchParams(query);
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return search ? `${path}?${search}` : path;
}

/**
 * Metadata for page 2 and later: its own title and canonical URL, and kept out of search results
 * (the pages shift every 15 minutes) while search engines still follow the links on them.
 */
export function pagedMeta(meta: Metadata, path: string, page: number): Metadata {
  if (page <= 1) return meta;
  const title = typeof meta.title === "string" ? `${meta.title} (page ${page})` : meta.title;
  return {
    ...meta,
    title,
    robots: { index: false, follow: true },
    alternates: { ...meta.alternates, canonical: pageHref(path, page) },
  };
}
