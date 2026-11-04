import { describe, expect, it } from "vitest";

import { FeedError, parseFeed } from "./parse";

const RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Example</title>
    <atom:link href="https://example.com/feed" rel="self" type="application/rss+xml"/>
    <item>
      <title><![CDATA[Model &amp; agents: a <b>new</b> release]]></title>
      <link>https://example.com/post?utm_source=rss</link>
      <pubDate>Tue, 03 Nov 2026 12:00:00 GMT</pubDate>
      <description>&lt;p&gt;Hello &amp;amp; welcome&lt;/p&gt;</description>
      <category>AI</category>
      <category><![CDATA[Agents]]></category>
      <comments>https://news.example.com/item?id=1</comments>
    </item>
    <item>
      <title>Only content:encoded</title>
      <guid isPermaLink="true">https://example.com/second</guid>
      <dc:date xmlns:dc="http://purl.org/dc/elements/1.1/">2026-11-02T10:00:00Z</dc:date>
      <content:encoded><![CDATA[<p>Body text</p>]]></content:encoded>
    </item>
    <item>
      <title>No date</title>
      <link>https://example.com/third</link>
    </item>
  </channel>
</rss>`;

const ATOM = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Example Atom</title>
  <entry>
    <title type="html">Qwen &amp;amp; friends</title>
    <link href="https://example.org/self" rel="self"/>
    <link href="https://example.org/post" rel="alternate"/>
    <published>2026-11-03T16:29:48+00:00</published>
    <updated>2026-11-03T18:00:00+00:00</updated>
    <summary type="html">&lt;p&gt;It&amp;#x27;s here&lt;/p&gt;</summary>
    <category term="ai" />
    <category term="llms" />
  </entry>
</feed>`;

const RDF = `<?xml version="1.0"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://purl.org/rss/1.0/" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel><title>RDF</title></channel>
  <item><title>RDF item</title><link>https://example.net/a</link><dc:date>2026-11-01T00:00:00Z</dc:date></item>
</rdf:RDF>`;

describe("parseFeed", () => {
  it("reads RSS 2.0 items: title, link, date, summary, categories and comments", () => {
    const [first, second, third] = parseFeed(RSS);
    // CDATA is passed through as written; plainText() cleans it later.
    expect(first.title).toBe("Model &amp; agents: a <b>new</b> release");
    expect(first.link).toBe("https://example.com/post?utm_source=rss");
    expect(first.date).toBe(Date.UTC(2026, 10, 3, 12));
    expect(first.summary).toContain("<p>Hello &amp; welcome</p>");
    expect(first.categories).toEqual(["AI", "Agents"]);
    expect(first.comments).toBe("https://news.example.com/item?id=1");

    expect(second.link).toBe("https://example.com/second");
    expect(second.date).toBe(Date.UTC(2026, 10, 2, 10));
    expect(second.summary).toBe("<p>Body text</p>");

    expect(third.date).toBeNull();
  });

  it("reads Atom entries and prefers the alternate link", () => {
    const [entry] = parseFeed(ATOM);
    expect(entry.link).toBe("https://example.org/post");
    expect(entry.date).toBe(Date.parse("2026-11-03T16:29:48+00:00"));
    expect(entry.categories).toEqual(["ai", "llms"]);
    expect(entry.title).toBe("Qwen &amp; friends");
  });

  it("reads RSS 1.0 (RDF)", () => {
    const [item] = parseFeed(RDF);
    expect(item.title).toBe("RDF item");
    expect(item.date).toBe(Date.UTC(2026, 10, 1));
  });

  it("returns no items for an empty channel", () => {
    expect(parseFeed('<rss version="2.0"><channel><title>Empty</title></channel></rss>')).toEqual([]);
  });

  it("rejects pages that aren't feeds", () => {
    expect(() => parseFeed("<!doctype html><html><body>Blocked</body></html>")).toThrow(FeedError);
    expect(() => parseFeed('{"items": []}')).toThrow(FeedError);
  });

  it("parses one-item feeds as a list", () => {
    const items = parseFeed('<rss><channel><item><title>One</title><link>https://a.example/1</link></item></channel></rss>');
    expect(items).toHaveLength(1);
  });
});
