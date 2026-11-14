import { describe, expect, it } from "vitest";

import { pageHref, paginate, pagedMeta, readPage } from "./paging";

describe("paging", () => {
  it("reads only plain positive page numbers", () => {
    expect(readPage(undefined)).toBe(1);
    expect(readPage("3")).toBe(3);
    expect(readPage(["2", "5"])).toBe(2);
    for (const bad of ["0", "-1", "2.5", "abc", "1e3", "", "01", "99999"]) expect(readPage(bad), bad).toBeNull();
  });

  it("cuts a list into pages and has no page past the end", () => {
    const items = Array.from({ length: 120 }, (_, i) => i);
    expect(paginate(items, 1)).toMatchObject({ page: 1, pages: 3, total: 120 });
    expect(paginate(items, 3)!.items).toEqual(items.slice(100));
    expect(paginate(items, 4)).toBeNull();
    // An empty list still has its first page, so "nothing here yet" can be shown.
    expect(paginate([], 1)).toMatchObject({ items: [], pages: 1 });
    expect(paginate([], 2)).toBeNull();
  });

  it("gives page 1 the plain address and keeps other parameters", () => {
    expect(pageHref("/topic/models", 1)).toBe("/topic/models");
    expect(pageHref("/topic/models", 2)).toBe("/topic/models?page=2");
    expect(pageHref("/search", 3, { q: "gpt 5" })).toBe("/search?q=gpt+5&page=3");
  });

  it("keeps later pages out of search results but lets crawlers follow them", () => {
    expect(pagedMeta({ title: "Models" }, "/topic/models", 1)).toEqual({ title: "Models" });
    expect(pagedMeta({ title: "Models", alternates: { canonical: "/topic/models" } }, "/topic/models", 2)).toEqual({
      title: "Models (page 2)",
      robots: { index: false, follow: true },
      alternates: { canonical: "/topic/models?page=2" },
    });
  });
});
