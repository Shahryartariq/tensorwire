import { describe, expect, it } from "vitest";

import { measurementId } from "./analytics";
import { buildCsp } from "./csp";
import { clusterStories } from "./cluster";
import { search } from "./load";
import { SAMPLE_NOW, sampleItems } from "./sample";
import { absolute, jsonLd, siteUrl } from "./site";
import { SOURCES } from "./sources";
import { toStories } from "./stories";

describe("site", () => {
  it("picks the public URL from SITE_URL, then the production address on Vercel, then localhost", () => {
    const saved = { ...process.env };
    process.env.SITE_URL = "";
    process.env.VERCEL = "1";
    expect(siteUrl().toString()).toBe("https://tensorwire.vercel.app/");
    expect(absolute("/topic/models")).toBe("https://tensorwire.vercel.app/topic/models");
    process.env.SITE_URL = "https://ai.example.com";
    expect(siteUrl().toString()).toBe("https://ai.example.com/");
    process.env.SITE_URL = "";
    process.env.VERCEL = "";
    expect(siteUrl().toString()).toBe("http://localhost:3000/");
    process.env = saved;
  });

  it("escapes </script> inside structured data", () => {
    expect(jsonLd({ name: "</script><b>" })).not.toContain("</script>");
    expect(JSON.parse(jsonLd({ name: "</script>" })).name).toBe("</script>");
  });
});

describe("search", () => {
  const clusters = clusterStories(
    SOURCES.flatMap((s) => toStories(s, sampleItems(s.slug), SAMPLE_NOW)),
    new Map(SOURCES.map((s) => [s.slug, s])),
  );

  it("finds stories containing every word, in headlines or summaries", () => {
    expect(search(clusters, "flashprove").length).toBe(1);
    expect(search(clusters, "Pando git").length).toBe(1);
    expect(search(clusters, "zkSNARK").length).toBe(1);
    expect(search(clusters, "flashprove pando")).toEqual([]);
  });

  it("ignores empty and symbol-only queries", () => {
    expect(search(clusters, "")).toEqual([]);
    expect(search(clusters, "  ** ")).toEqual([]);
  });
});

describe("analytics and security policy", () => {
  it("accepts only well-formed GA4 measurement IDs", () => {
    const saved = process.env.GA_MEASUREMENT_ID;
    for (const [value, expected] of [
      ["G-ABC123XYZ9", "G-ABC123XYZ9"],
      [" g-abc123xyz9 ", "G-ABC123XYZ9"],
      ["UA-12345-1", null],
      ["G-1;alert(1)", null],
      ["", null],
    ] as const) {
      process.env.GA_MEASUREMENT_ID = value;
      expect(measurementId(), value).toBe(expected);
    }
    process.env.GA_MEASUREMENT_ID = saved;
  });

  it("allows Google Analytics hosts only when analytics is on", () => {
    const off = buildCsp({ nonce: "abc", dev: false, analytics: false });
    const on = buildCsp({ nonce: "abc", dev: false, analytics: true });
    expect(off).not.toContain("google");
    expect(on).toContain("https://www.googletagmanager.com");
    expect(on).toContain("frame-ancestors 'none'");
    expect(on).not.toContain("unsafe-inline");
  });
});
