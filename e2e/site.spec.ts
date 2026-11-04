import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const problems: string[] = [];

test.beforeEach(async ({ page }) => {
  problems.length = 0;
  page.on("pageerror", (error) => problems.push(error.message));
  // Script errors and Content Security Policy violations are logged as console errors.
  page.on("console", (message) => {
    // A deliberate 404 page logs its own status; that's expected, not a bug.
    if (message.type() === "error" && !message.text().includes("status of 404")) problems.push(message.text());
  });
});

test.afterEach(() => {
  expect(problems, "errors in the browser console").toEqual([]);
});

async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}

async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

test.describe("front page", () => {
  test("leads with the most covered story and lists the rest by age", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: "Today in AI" })).toBeVisible();

    const lead = page.locator(".lead");
    await expect(lead.getByRole("heading", { level: 2 })).toContainText("FlashProve");
    await expect(lead.getByText("Reported by 2 sources")).toBeVisible();
    await expect(lead.getByRole("link", { name: /TechCrunch/ })).toHaveAttribute("href", /techcrunch\.com/);

    await expect(page.getByRole("heading", { level: 2, name: "Past 6 hours" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Earlier today" })).toBeVisible();
    expect(await page.locator(".story").count()).toBeGreaterThan(40);
    // The lead isn't repeated in the list below it.
    await expect(page.locator(".story-title", { hasText: "FlashProve" })).toHaveCount(0);
  });

  test("shows a story once with all of its coverage, and lab posts as official", async ({ page }) => {
    await page.goto("/");
    const pando = page.locator(".story", { hasText: "Scaling Git at OpenAI" });
    await expect(pando).toHaveCount(1);
    await expect(pando.locator(".official")).toHaveText("Official");
    await expect(pando.getByRole("img", { name: "Reported by 2 sources" })).toBeVisible();
    await expect(pando.locator(".also").getByRole("link", { name: "MarkTechPost" })).toHaveAttribute("href", /marktechpost\.com/);
    await expect(pando.getByRole("link", { name: "Scaling Git at OpenAI" })).toHaveAttribute(
      "href",
      "https://openai.com/index/scaling-git-at-openai",
    );
  });

  test("ranks the most covered stories and counts topics", async ({ page }) => {
    await page.goto("/");
    const ranked = page.getByRole("region", { name: "Most covered this week" }).getByRole("listitem");
    expect(await ranked.count()).toBeGreaterThanOrEqual(3);
    const topics = page.getByRole("region", { name: "Browse by topic" }).getByRole("link");
    await expect(topics).toHaveCount(8);
    await expect(topics.first()).toContainText(/Models\s*\d+/);
  });

  test("marks stories that are new since the last visit", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".new-since")).toHaveCount(0);
    // The first visit records the newest story once the page has hydrated.
    await page.waitForFunction(() => localStorage.getItem("tensorwire:seen") !== null);
    // Pretend the last visit saw everything up to six hours before the newest story.
    await page.evaluate(() => {
      const newest = Math.max(...[...document.querySelectorAll<HTMLElement>(".story[data-ts]")].map((r) => Number(r.dataset.ts)));
      localStorage.setItem("tensorwire:seen", String(newest - 6 * 3_600_000));
    });
    await page.reload();
    await expect(page.locator(".new-since")).toContainText(/\d+ new stor(y|ies) since your last visit/);
    expect(await page.locator(".story.is-new").count()).toBeGreaterThan(0);
  });

  test("is accessible and fits the screen", async ({ page }) => {
    await page.goto("/");
    await expectAccessible(page);
    await noHorizontalScroll(page);
  });

  test("skip link moves focus to the news", async ({ page, isMobile }) => {
    test.skip(isMobile, "Keyboard navigation is a desktop check");
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to the news" });
    await expect(skip).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("main")).toBeFocused();
  });
});

test.describe("sections", () => {
  test("topic pages filter the wire and mark the current section", async ({ page }) => {
    await page.goto("/topic/business");
    await expect(page.getByRole("heading", { level: 1, name: "Business" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Sections" }).getByRole("link", { name: "Business" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    const rows = page.locator(".story");
    expect(await rows.count()).toBeGreaterThan(3);
    await expect(page.locator(".story", { hasText: "Fal doubles its valuation" })).toHaveCount(1);
    await expectAccessible(page);
  });

  test("the labs page shows only official posts", async ({ page }) => {
    await page.goto("/labs");
    await expect(page.getByRole("heading", { level: 1, name: "From the labs" })).toBeVisible();
    const rows = page.locator(".story");
    const count = await rows.count();
    expect(count).toBeGreaterThan(10);
    await expect(rows.locator(".official")).toHaveCount(count);
  });

  test("source pages show the source's stories and a link to its site", async ({ page }) => {
    await page.goto("/source/hugging-face");
    await expect(page.getByRole("heading", { level: 1, name: "Hugging Face" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Visit Hugging Face" })).toHaveAttribute("href", "https://huggingface.co/blog");
    await expect(page.locator(".story-source", { hasText: "Hugging Face" })).toHaveCount(5);
  });

  test("the sources page lists every feed with its status", async ({ page }) => {
    await page.goto("/sources");
    await expect(page.locator(".source-list li")).toHaveCount(18);
    await expect(page.locator(".source-status .ok")).toHaveCount(18);
    await expectAccessible(page);
  });

  test("the about page explains the site", async ({ page }) => {
    await page.goto("/about");
    await expect(page.getByRole("heading", { level: 1, name: "About Tensorwire" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "How stories are grouped" })).toBeVisible();
    await expectAccessible(page);
  });
});

test.describe("search", () => {
  test("finds stories from the search box", async ({ page }) => {
    await page.goto("/");
    const box = page.getByRole("searchbox", { name: "Search AI news" });
    await box.fill("pando");
    await box.press("Enter");
    await expect(page).toHaveURL(/\/search\?q=pando$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Results for “pando”");
    await expect(page.getByRole("status")).toHaveText("1 story found.");
    await expect(page.locator(".story")).toHaveCount(1);
    await expect(box).toHaveValue("pando");
  });

  test("explains when nothing matches", async ({ page }) => {
    await page.goto("/search?q=nothing-matches-this");
    await expect(page.getByText(/Nothing matches every word/)).toBeVisible();
    await expect(page.locator("meta[name=robots]")).toHaveAttribute("content", /noindex/);
    await expectAccessible(page);
  });

  test("treats markup in the query as text", async ({ page }) => {
    await page.goto("/search?q=%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("<img src=x onerror=alert(1)>");
    await expect(page.locator("main img")).toHaveCount(0);
  });
});

test.describe("search engines", () => {
  test("pages have a unique title, description, canonical URL and structured data", async ({ page }) => {
    const seen = new Set<string>();
    for (const path of ["/", "/labs", "/topic/models", "/source/openai", "/sources", "/about"]) {
      await page.goto(path);
      const title = await page.title();
      expect(seen.has(title), `duplicate title ${title}`).toBe(false);
      seen.add(title);
      expect(title).toContain("Tensorwire");
      const description = await page.locator('meta[name="description"]').getAttribute("content");
      expect(description!.length).toBeGreaterThan(70);
      expect(description!.length).toBeLessThanOrEqual(200);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `http://localhost:3000${path === "/" ? "" : path}`);
      await expect(page.locator('meta[property="og:image"]').first()).toHaveAttribute("content", /opengraph-image/);
      await expect(page.locator("h1")).toHaveCount(1);
    }

    await page.goto("/topic/agents");
    const data = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!);
    expect(data.map((d: { "@type": string }) => d["@type"])).toEqual(["CollectionPage", "BreadcrumbList"]);
    expect(data[0].mainEntity.itemListElement.length).toBeGreaterThan(0);
  });

  test("the home page describes the site and its search", async ({ page }) => {
    await page.goto("/");
    const data = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!);
    expect(data[0]["@type"]).toBe("WebSite");
    expect(data[0].potentialAction.target.urlTemplate).toContain("/search?q={search_term_string}");
    expect(data[1].itemListElement).toHaveLength(10);
    await expect(page.locator('link[rel="alternate"][type="application/rss+xml"]')).toHaveAttribute("href", /\/feed\.xml$/);
  });

  test("sitemap, robots and feed are served", async ({ request }) => {
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap.match(/<url>/g)).toHaveLength(1 + 1 + 8 + 18 + 2);
    expect(sitemap).not.toContain("/search");
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Sitemap: http://localhost:3000/sitemap.xml");
    const feed = await request.get("/feed.xml");
    expect(feed.headers()["content-type"]).toContain("application/rss+xml");
    expect((await feed.text()).match(/<item>/g)).toHaveLength(50);
  });

  test("unknown pages return 404 with a way back", async ({ page, request }) => {
    for (const path of ["/topic/nope", "/source/nope", "/nope"]) {
      expect((await request.get(path)).status(), path).toBe(404);
    }
    await page.goto("/topic/nope");
    await expect(page.getByRole("heading", { level: 1, name: "This page isn’t on the wire" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Go to today’s news" })).toBeVisible();
  });
});

test.describe("security", () => {
  test("sends a strict Content Security Policy with a fresh nonce", async ({ request }) => {
    const first = await request.get("/");
    const second = await request.get("/");
    const csp = first.headers()["content-security-policy"];
    expect(csp).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).not.toContain("unsafe-inline");
    expect(second.headers()["content-security-policy"]).not.toBe(csp);
    expect(first.headers()["x-frame-options"]).toBe("DENY");
    expect(first.headers()["x-content-type-options"]).toBe("nosniff");
    expect(first.headers()["strict-transport-security"]).toContain("max-age=");
    expect(first.headers()["x-powered-by"]).toBeUndefined();
  });

  test("links to articles are plain http(s) links", async ({ page }) => {
    await page.goto("/");
    const hrefs = await page.locator(".story-title a, .lead-title a").evaluateAll((links) => links.map((a) => a.getAttribute("href")));
    expect(hrefs.length).toBeGreaterThan(40);
    expect(hrefs.every((href) => /^https?:\/\//.test(href!))).toBe(true);
  });
});

test("works without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.locator(".lead-title")).toContainText("FlashProve");
  await page.getByRole("searchbox", { name: "Search AI news" }).fill("gemini");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page).toHaveURL(/\/search\?q=gemini/);
  expect(await page.locator(".story").count()).toBeGreaterThan(0);
  await context.close();
});
