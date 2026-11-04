import { describe, expect, it } from "vitest";

import { parseFeed } from "./parse";
import { READABLE_WORDS, cleanArticle, countWords, readingMinutes } from "./reader";
import { SOURCES } from "./sources";
import { toStories } from "./stories";

const words = (n: number) => Array.from({ length: n }, (_, i) => `word${i}`).join(" ");
const URL_ = "https://example.com/blog/2026/post";

describe("reader view: cleaning feed HTML", () => {
  it("keeps text structure and drops everything else", () => {
    const { html } = cleanArticle(
      `<h1>Title</h1><p class="x" style="color:red" onclick="steal()">Hello <b>bold</b> and <i>italic</i></p>
       <script>alert(1)</script><style>p{}</style><form><input></form><iframe src="https://e.com"></iframe>
       <ul><li>One</li></ul><blockquote><p>Quote</p></blockquote><pre><code>a &lt; b</code></pre>
       <table><tr><td colspan="2" width="9">cell</td></tr></table>`,
      URL_,
    );
    expect(html).toContain("<h2>Title</h2>");
    expect(html).toContain("<p>Hello <strong>bold</strong> and <em>italic</em></p>");
    expect(html).toContain("<ul><li>One</li></ul>");
    expect(html).toContain("<pre><code>a &lt; b</code></pre>");
    expect(html).toContain('<td colspan="2">cell</td>');
    for (const bad of ["script", "style", "onclick", "iframe", "form", "input", "class=", "width="]) expect(html).not.toContain(bad);
  });

  it("removes images and their captions, and counts what was left out", () => {
    const result = cleanArticle(
      `<p>Text</p><figure><img src="a.png" onerror="x()"><figcaption>Caption</figcaption></figure><video src="v.mp4"></video><img src=b.png>`,
      URL_,
    );
    expect(result.html).toBe("<p>Text</p>");
    expect(result.media).toBe(3);
  });

  it("makes links absolute, safe and nofollow, and unwraps links that go nowhere", () => {
    const { html } = cleanArticle(
      `<p><a href="/other" title="t" target="_blank">rel</a> <a href="#notes">anchor</a>
       <a href="javascript:alert(1)">js</a> <a href="data:text/html,x">data</a> <a>bare</a>
       <a href="mailto:a@b.co">mail</a> <a href="//evil.example/x">proto</a></p>`,
      URL_,
    );
    expect(html).toContain('<a href="https://example.com/other" rel="nofollow noopener noreferrer">rel</a>');
    expect(html).toContain('<a href="https://example.com/blog/2026/post#notes" rel="nofollow noopener noreferrer">anchor</a>');
    expect(html).toContain('<a href="mailto:a@b.co" rel="nofollow noopener noreferrer">mail</a>');
    expect(html).not.toMatch(/javascript:|data:|target=|title=/);
    // Unsafe or empty links keep their text but lose the address, so they aren't links.
    expect(html).toContain("<a>js</a> <a>data</a> <a>bare</a>");
    // Every link is closed as a link.
    expect(html.match(/<a\b/g)?.length).toBe(html.match(/<\/a>/g)?.length);
    expect(html).not.toContain("</span>");
    // Protocol-relative links resolve to the article's https origin, never to a bare //host.
    expect(html).not.toContain('href="//');
  });

  it("drops empty paragraphs and feed boilerplate", () => {
    const { html } = cleanArticle(
      `<p>Real text.</p><p> </p><p>The post Hello appeared first on Example News.</p><p>Continue reading…</p><p>Read more</p><p><a href="/a">Read full article</a></p><p><a href="/a#comments">Comments</a></p>`,
      URL_,
    );
    expect(html).toBe("<p>Real text.</p>");
  });

  it("counts words and minutes from the cleaned text", () => {
    const result = cleanArticle(`<p>${words(460)}</p><script>${words(1000)}</script>`, URL_);
    expect(result.words).toBe(460);
    expect(result.minutes).toBe(2);
    expect(countWords("one, two — three 4 ... !")).toBe(4);
  });
});

describe("reader view: which stories can be read here", () => {
  it("needs enough words to be a post, not a summary", () => {
    expect(readingMinutes(undefined)).toBeUndefined();
    expect(readingMinutes(`<p>${words(READABLE_WORDS - 1)}</p>`)).toBeUndefined();
    expect(readingMinutes(`<p>${words(READABLE_WORDS)}</p>`)).toBe(1);
    expect(readingMinutes(`<p>${words(1150)}</p>`)).toBe(5);
  });

  it("leaves out posts the feed cuts off with a link to the rest", () => {
    const body = `<p>${words(400)}</p>`;
    for (const ending of [
      '<p><a href="https://example.com/a">Read full article</a></p><p><a href="https://example.com/a#comments">Comments</a></p>',
      "<p>Continue reading on Example →</p>",
      '<p><a href="https://example.com/a">Read the rest of this post</a></p>',
      "<p>and then the story went on […]</p>",
      "<p>and then the story went on…</p>",
    ]) {
      expect(readingMinutes(body + ending), ending).toBeUndefined();
    }
    // A whole post with the usual WordPress trailer is still readable.
    expect(readingMinutes(`${body}<p>The post Example appeared first on Example News.</p>`)).toBe(2);
    expect(readingMinutes(`${body}<p>Read more about the project on its site, which has documentation and downloads.</p><p>${words(50)}</p>`)).toBe(2);
  });

  it("takes the fullest text from RSS content:encoded or Atom content", () => {
    const rss = parseFeed(`<rss><channel><item><title>A</title><link>https://example.com/a</link>
      <pubDate>Tue, 03 Nov 2026 10:00:00 GMT</pubDate><description>Short summary.</description>
      <content:encoded><![CDATA[<p>${words(300)}</p>]]></content:encoded></item></channel></rss>`);
    expect(rss[0].summary).toBe("Short summary.");
    expect(rss[0].body).toContain("word299");

    const atom = parseFeed(`<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>B</title>
      <link href="https://example.com/b"/><updated>2026-11-03T10:00:00Z</updated>
      <summary>Short.</summary><content type="html">&lt;p&gt;${words(200)}&lt;/p&gt;</content></entry></feed>`);
    expect(atom[0].body).toContain("word199");

    const onlyDescription = parseFeed(`<rss><channel><item><title>C</title><link>https://example.com/c</link>
      <pubDate>Tue, 03 Nov 2026 10:00:00 GMT</pubDate><description>Only this.</description></item></channel></rss>`);
    expect(onlyDescription[0].body).toBe("Only this.");
  });

  it("marks stories with their reading time", () => {
    const source = SOURCES[0];
    const now = Date.parse("2026-11-03T12:00:00Z");
    const item = (title: string, body: string) => ({
      title,
      link: `${source.homepage}/${title}`,
      date: now - 3_600_000,
      summary: "A short summary of the post that is long enough to show.",
      body,
      categories: [],
    });
    const [long, short] = toStories(source, [item("long", `<p>${words(700)}</p>`), item("short", "<p>Only a summary.</p>")], now)
      .sort((a, b) => a.title.localeCompare(b.title));
    expect(long.read).toBe(3);
    expect(short.read).toBeUndefined();
  });
});
