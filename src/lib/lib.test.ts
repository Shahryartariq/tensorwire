import { describe, expect, it } from "vitest";

import { clusterStories, leadCluster, mostCovered } from "./cluster";
import { SAMPLE_NOW, sampleItems } from "./sample";
import { SOURCES, sourceBySlug } from "./sources";
import { MAX_AGE, PER_SOURCE, isNews, toStories } from "./stories";
import { excerpt, hashId, plainText, safeUrl, tokens, urlKey } from "./text";
import { ago, agoLong, bucketize, formatDate } from "./time";
import { TOPICS, topicBySlug, topicsFor } from "./topics";
import type { RawItem, Source, Story } from "./types";

const HOUR = 3_600_000;
const NOW = Date.UTC(2026, 10, 4, 6);
const SOURCE_MAP = new Map(SOURCES.map((s) => [s.slug, s]));

const item = (overrides: Partial<RawItem> = {}): RawItem => ({
  title: "A new open-weight model",
  link: "https://example.com/a",
  date: NOW - HOUR,
  summary: "<p>A long enough summary about a new model that was released today by a lab.</p>",
  categories: [],
  ...overrides,
});

const testSource: Source = {
  slug: "test",
  name: "Test",
  homepage: "https://example.com/",
  feed: "https://example.com/feed",
  kind: "press",
  about: "Test source.",
};

function allSampleStories(): Story[] {
  return SOURCES.flatMap((s) => toStories(s, sampleItems(s.slug), SAMPLE_NOW));
}

describe("text", () => {
  it("turns feed HTML into plain text, including double-encoded markup", () => {
    expect(plainText("<p>Hello &amp; <b>welcome</b></p>")).toBe("Hello & welcome");
    expect(plainText("&lt;p&gt;It&amp;#x27;s here&lt;/p&gt;")).toBe("It's here");
    expect(plainText("<script>alert(1)</script>Safe")).toBe("Safe");
    expect(plainText("Line<br>break\n\n  spaces")).toBe("Line break spaces");
    expect(plainText("")).toBe("");
  });

  it("shortens text at a word boundary", () => {
    expect(excerpt("short")).toBe("short");
    const long = "word ".repeat(80).trim();
    const cut = excerpt(long, 50);
    expect(cut.length).toBeLessThanOrEqual(50);
    expect(cut.endsWith("…")).toBe(true);
    expect(cut).not.toMatch(/ …$/);
  });

  it("accepts only http(s) URLs and strips tracking parameters", () => {
    expect(safeUrl("https://a.example/x?utm_source=rss&id=2#top")).toBe("https://a.example/x?id=2");
    expect(safeUrl("/relative", "https://a.example/blog/")).toBe("https://a.example/relative");
    expect(safeUrl("javascript:alert(1)")).toBeNull();
    expect(safeUrl("https://user:pass@a.example/")).toBeNull();
    expect(safeUrl("not a url")).toBeNull();
    expect(safeUrl(undefined)).toBeNull();
  });

  it("gives the same key to the same article reached through different URLs", () => {
    expect(urlKey("https://www.a.example/post/")).toBe(urlKey("https://a.example/post"));
    expect(hashId("a")).toBe(hashId("a"));
    expect(hashId("a")).not.toBe(hashId("b"));
  });

  it("tokenizes headlines without stop words or plurals", () => {
    expect(tokens("OpenAI’s new Git backends are here")).toEqual(["openai", "git", "backend"]);
    expect(tokens("Llama.cpp and GPT-5.1")).toEqual(["llama.cpp", "gpt-5.1"]);
  });
});

describe("stories", () => {
  it("cleans titles and summaries and keeps a link to the original", () => {
    const [story] = toStories(testSource, [item({ title: "Model &amp; agents <b>news</b>" })], NOW);
    expect(story.title).toBe("Model & agents news");
    expect(story.summary).toMatch(/^A long enough summary/);
    expect(story.url).toBe("https://example.com/a");
    expect(story.topics).toContain("models");
  });

  it("drops items without a title, link or date, and items that are too old or far in the future", () => {
    const items = [
      item({ title: "" }),
      item({ link: "javascript:alert(1)" }),
      item({ date: null }),
      item({ link: "https://example.com/old", date: NOW - MAX_AGE - HOUR }),
      item({ link: "https://example.com/future", date: NOW + 48 * HOUR }),
      item({ link: "https://example.com/skew", date: NOW + HOUR }),
    ];
    const stories = toStories(testSource, items, NOW);
    expect(stories.map((s) => s.url)).toEqual(["https://example.com/skew"]);
    expect(stories[0].publishedAt).toBe(NOW);
  });

  it("removes duplicate URLs, sorts newest first and caps each source", () => {
    const many = Array.from({ length: PER_SOURCE + 10 }, (_, i) =>
      item({ link: `https://example.com/${i}`, date: NOW - i * HOUR }),
    );
    const stories = toStories(testSource, [...many, item({ link: "https://example.com/0?utm_medium=x" })], NOW);
    expect(stories).toHaveLength(PER_SOURCE);
    expect(stories[0].url).toBe("https://example.com/0");
    expect(new Set(stories.map((s) => s.id)).size).toBe(PER_SOURCE);
  });

  it("hides summaries that are captions, categories or boilerplate", () => {
    const short = toStories(testSource, [item({ summary: "Overview" })], NOW)[0];
    const category = toStories(testSource, [item({ summary: "General Science and Health", categories: ["General Science and Health"] })], NOW)[0];
    const hn = toStories(testSource, [item({ summary: "Article URL: https://x.example Comments URL: https://news.example" })], NOW)[0];
    const off = toStories({ ...testSource, summaries: false }, [item()], NOW)[0];
    expect([short, category, hn, off].every((s) => s.summary === undefined)).toBe(true);
  });

  it("applies each source's own filter", () => {
    const nvidia = sourceBySlug("nvidia")!;
    const gaming = item({ title: "GFN Thursday: new games", categories: ["Gaming", "GeForce NOW"] });
    const ai = item({ title: "AI factories explained", link: "https://example.com/b", categories: ["AI"] });
    expect(toStories(nvidia, [gaming, ai], NOW).map((s) => s.title)).toEqual(["AI factories explained"]);

    const mit = sourceBySlug("mit-technology-review")!;
    expect(toStories(mit, [item({ categories: ["Artificial intelligence", "sponsored"] })], NOW)).toHaveLength(0);

    const simon = sourceBySlug("simon-willison")!;
    expect(toStories(simon, [item({ categories: ["python", "uv"] })], NOW)).toHaveLength(0);
    expect(toStories(simon, [item({ categories: ["llms"] })], NOW)).toHaveLength(1);
  });

  it("keeps a discussion link when the feed has one", () => {
    const [story] = toStories(testSource, [item({ comments: "https://news.ycombinator.com/item?id=1" })], NOW);
    expect(story.discussion).toBe("https://news.ycombinator.com/item?id=1");
  });
});

describe("not news", () => {
  // Real headlines from the wire on 13 Nov 2026.
  it("drops tutorials, listicles, explainers and promotions", () => {
    for (const title of [
      "5 FREE Open-Source Alternatives to Jev",
      "7 FREE Books to Learn About Building AI Systems",
      "9 Key LLM Inference Metrics Explained in 5 Minutes",
      "5 Techniques for Fine-Tuning LLMs Without Breaking the Bank",
      "How to Use AI for Enterprise BI",
      "How to Check Local LLM Output with Ollama, Gemma 4, and Nimble",
      "How to use Claude AI for Investing and Equity Research",
      "A Practical Blueprint for an AI-Ready Enterprise",
      "A Jev of All Trades: Build and Train a Jev-style Decision Model From Scratch",
      "What Is Reward Hacking? When AI Optimizes the Metric Instead of the Goal",
      "Presentation: Opening the Black Box: Critical Explainability for AI Agent Tool Selection",
      "What to expect during SC26: Join theCUBE Nov. 17–19",
      "3 ways AI is changing the healthcare revenue cycle",
      "5 apps I need Siri AI to work with now that it's open to third-party developers",
    ]) {
      expect(isNews(title), title).toBe(false);
    }
  });

  it("keeps news, including headlines that start with numbers or 'How'", () => {
    for (const title of [
      "How LinkedIn, Netflix & DoorDash Run Agents, Evals & Inference in Production: QCon AI New York 2026",
      "Google Finds That Technical Debt Can Derail Coding Agents through \"Agent Distraction\"",
      "Jensen Huang Resigns as Nvidia CEO",
      "Introducing Gemini 4 Hydrogen",
      "AI agent tooling provider LangChain secures $300M investment",
      "I Mutation-Tested 50 Python Libraries. Tests in the Young Ones Missed 41% of Planted Faults.",
      "Humanoid Robots Are Coming to Factories. Who Is Responsible When They Fail?",
      "Why Agentic AI Projects Get Canceled, and What an Eight-Week Pilot Gets Right",
      "2 million developers now use Codex every week",
      "50 AI agents tried to build a thriving Minecraft civilization – it didn't end well",
      "OpenAI reportedly raises an additional $11 billion at a $1.25 trillion valuation",
    ]) {
      expect(isNews(title), title).toBe(true);
    }
  });
});

describe("topics", () => {
  it("has unique slugs and a description for every topic", () => {
    expect(new Set(TOPICS.map((t) => t.slug)).size).toBe(TOPICS.length);
    for (const topic of TOPICS) {
      expect(topic.description.length).toBeGreaterThan(60);
      expect(topic.description.length).toBeLessThanOrEqual(160);
      expect(topicBySlug(topic.slug)).toBe(topic);
    }
    expect(topicBySlug("nope")).toBeUndefined();
  });

  it.each([
    ["Gemini 4 Carbon: Our next frontier model", "models"],
    ["Coding agents now use computer use and MCP", "agents"],
    ["Tencent releases an Apache 2.0 vision model on Hugging Face", "open-source"],
    ["Researchers publish a paper on interpretability", "research"],
    ["Apple starts giving Siri AI access to third-party apps", "products"],
    ["Data centers turn to old jet engines for power", "hardware"],
    ["Court rules on AI copyright lawsuit", "policy"],
    ["AI inference startup Fal raises $1.3 billion", "business"],
  ] as const)("tags “%s” as %s", (title, topic) => {
    expect(topicsFor(title, "", [])).toContain(topic);
  });

  it("prefers headline matches and returns at most three topics", () => {
    const topics = topicsFor("New model", "agents, open-source research about chips and a lawsuit and funding", []);
    expect(topics[0]).toBe("models");
    expect(topics.length).toBeLessThanOrEqual(3);
    expect(topicsFor("A quiet day", "", [])).toEqual([]);
  });
});

describe("grouping", () => {
  const stories = allSampleStories();
  const clusters = clusterStories(stories, SOURCE_MAP);
  const groupOf = (title: string) => clusters.find((c) => c.stories.some((s) => s.title.startsWith(title)))!;

  it("puts reports of the same news together", () => {
    expect(groupOf("Anthropic is working on a system to prove").sources.sort()).toEqual(["marktechpost", "techcrunch"]);
    expect(groupOf("Google will let schools disable").sources.sort()).toEqual(["ars-technica", "techcrunch"]);
  });

  it("lets the lab's own post lead its coverage", () => {
    const pando = groupOf("Scaling Git at OpenAI");
    expect(pando.lead.source).toBe("openai");
    expect(pando.stories.map((s) => s.source)).toEqual(["openai", "marktechpost"]);
  });

  it("doesn't merge different stories that share common words", () => {
    expect(groupOf("Claude’s new rules against game cloning").stories).toHaveLength(1);
    expect(groupOf("Building ultra-low-latency voice AI").stories).toHaveLength(1);
  });

  it("doesn't chain different launches together through common words", () => {
    // Headlines from the live wire on 13 Nov 2026: three Google launches in one week.
    const at = Date.UTC(2026, 10, 12, 12);
    const story = (source: string, title: string, hours: number): Story => ({
      id: hashId(`${source}:${title}`),
      source,
      title,
      url: `https://example.com/${hashId(title)}`,
      publishedAt: at + hours * 3_600_000,
      topics: [],
    });
    const gemini = [
      story("google-ai", "Gemini Decisions API: Fast, calibrated multimodal decisions", 0),
      story("marktechpost", "Google Launches Gemini Decisions API With Gemini Decision 1 at $0.10/M Tokens", 3),
      story("simon-willison", "Gemini Decisions API", 4),
      story("siliconangle", "Google enters decision model market with Gemini Decisions API", 5),
      story("google-deepmind", "Introducing Gemini 4 Hydrogen", -20),
      story("google-ai", "Google Search gets a major upgrade with Gemini 4 Hydrogen", -19),
      story("ars-technica", "Google rolls out Gemini 4 Hydrogen, finally replacing 3.8 Flash", -18),
      story("siliconangle", "Google releases Gemini 4 Hydrogen, a lower-cost model said to outscore Argon", -17),
      story("analytics-india", "Google Launches Gemini 4 Hydrogen for Faster Coding and AI Workflows", -16),
      story("marktechpost", "Google Releases Gemini 4 Hydrogen: 2.5x Faster Than Gemini 3.8 Flash", -15),
      story("google-cloud-ai", "Introducing Gemini for healthcare", -40),
      story("techcrunch", "Google Cloud launches Gemini for healthcare", -38),
    ];
    // Padding to the size of the real wire, where "Google", "Gemini" and "launches" are common.
    const padding = Array.from({ length: 1000 }, (_, i) =>
      story(SOURCES[i % SOURCES.length].slug, `Google ${["launches", "releases", "brings"][i % 3]} Gemini update ${i} for ${["Docs", "Maps", "Chrome", "Pixel"][i % 4]} users`, -60 - i / 10),
    );
    // "Decision" and "API" are in a couple of dozen headlines on the real wire: uncommon, not rare.
    const fairlyCommon = Array.from({ length: 20 }, (_, i) =>
      story(SOURCES[(i * 7) % SOURCES.length].slug, i % 2 ? `New API ${i} for ${["billing", "search"][i % 2]} teams` : `Board decision ${i} on chip exports`, -100 - i),
    );
    const groups = clusterStories([...gemini, ...padding, ...fairlyCommon], SOURCE_MAP);
    const titlesWith = (word: string) =>
      groups.find((c) => c.stories.some((s) => s.title.includes(word)))!.stories.map((s) => s.title);
    expect(titlesWith("Decisions")).toHaveLength(4);
    expect(titlesWith("Hydrogen")).toHaveLength(6);
    expect(titlesWith("healthcare")).toHaveLength(2);
    expect(titlesWith("Hydrogen").every((t) => t.includes("Hydrogen"))).toBe(true);
  });

  it("never groups round-up newsletters or two stories from one source", () => {
    for (const cluster of clusters) {
      expect(new Set(cluster.stories.map((s) => s.source)).size).toBe(cluster.stories.length);
      if (cluster.stories.length > 1) {
        expect(cluster.sources.some((s) => SOURCE_MAP.get(s)?.digest)).toBe(false);
      }
    }
  });

  it("keeps every story exactly once, newest groups first", () => {
    expect(clusters.flatMap((c) => c.stories)).toHaveLength(stories.length);
    expect(clusters.map((c) => c.latest)).toEqual([...clusters.map((c) => c.latest)].sort((a, b) => b - a));
  });

  it("leads with the most covered recent story and ranks coverage", () => {
    expect(leadCluster(clusters, SAMPLE_NOW)?.sources.length).toBe(2);
    const ranked = mostCovered(clusters, SAMPLE_NOW);
    expect(ranked.length).toBeGreaterThan(2);
    expect(ranked.every((c) => c.sources.length > 1)).toBe(true);
    expect(leadCluster([], SAMPLE_NOW)).toBeUndefined();
  });
});

describe("time", () => {
  it("formats compact and spoken ages", () => {
    expect(ago(NOW - 30_000, NOW)).toBe("now");
    expect(ago(NOW - 12 * 60_000, NOW)).toBe("12m");
    expect(ago(NOW - 3 * HOUR, NOW)).toBe("3h");
    expect(ago(NOW - 50 * HOUR, NOW)).toBe("2d");
    expect(ago(Date.UTC(2026, 9, 1), NOW)).toBe("Oct 1");
    expect(agoLong(NOW - HOUR, NOW)).toBe("1 hour ago");
    expect(agoLong(NOW - 3 * 60_000, NOW)).toBe("3 minutes ago");
    expect(formatDate(Date.UTC(2026, 10, 3, 14, 5))).toBe("3 Nov 2026, 14:05 UTC");
  });

  it("groups items by age and skips empty groups", () => {
    const times = [NOW - HOUR, NOW - 10 * HOUR, NOW - 30 * HOUR, NOW - 30 * 24 * HOUR];
    const groups = bucketize(times, (t) => t, NOW);
    expect(groups.map((g) => g.label)).toEqual(["Past 6 hours", "Earlier today", "Yesterday", "Older"]);
  });
});

describe("sources", () => {
  it("has unique slugs, https feeds and a description for each", () => {
    expect(new Set(SOURCES.map((s) => s.slug)).size).toBe(SOURCES.length);
    for (const source of SOURCES) {
      expect(source.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(source.feed.startsWith("https://")).toBe(true);
      expect(source.about.length).toBeGreaterThan(30);
    }
  });

  it("has sample data for every source", () => {
    for (const source of SOURCES) expect(sampleItems(source.slug).length, source.slug).toBeGreaterThan(0);
  });
});
