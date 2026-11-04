import { XMLParser } from "fast-xml-parser";
import { describe, expect, it, vi } from "vitest";

import { GET } from "./route";

describe("GET /feed.xml", () => {
  it("returns valid RSS with the latest stories, each linking to the original", async () => {
    vi.stubEnv("NEWS_SAMPLE_DATA", "1");
    const response = await GET();
    expect(response.headers.get("content-type")).toBe("application/rss+xml; charset=utf-8");
    expect(response.headers.get("cache-control")).toContain("s-maxage=900");
    const xml = await response.text();
    const doc = new XMLParser({ ignoreAttributes: false }).parse(xml);
    const items = doc.rss.channel.item;
    expect(doc.rss.channel.title).toBe("Tensorwire");
    expect(items.length).toBe(50);
    expect(items.every((i: { link: string }) => /^https:\/\//.test(i.link))).toBe(true);
    const flashprove = items.find((i: { title: string }) => i.title.includes("FlashProve"));
    expect(flashprove.description).toContain("Also reported by TechCrunch");
    vi.unstubAllEnvs();
  });
});
