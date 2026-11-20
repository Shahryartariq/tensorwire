import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { SOURCES } from "../src/lib/sources";

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
    await expect(page.getByRole("heading", { level: 1, name: "Today's AI news" })).toBeVisible();

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

  // Phone emulation widens the layout viewport to fit wide content, which hides overflow from the
  // check above; a plain 360px window doesn't.
  test("lays out at 360px wide without growing past the window", async ({ browser, baseURL, isMobile }) => {
    test.skip(isMobile, "Runs once, in its own 360px window");
    const context = await browser.newContext({ baseURL, viewport: { width: 360, height: 800 } });
    const page = await context.newPage();
    for (const path of ["/", "/labs", "/topic/models", "/source/openai", "/sources", "/about"]) {
      await page.goto(path);
      expect(await page.evaluate(() => document.documentElement.scrollWidth), path).toBeLessThanOrEqual(360);
    }
    await context.close();
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
    await expect(page.locator(".source-list li")).toHaveCount(SOURCES.length);
    // Every feed in the snapshot loads.
    await expect(page.locator(".source-status .ok")).toHaveCount(SOURCES.length);
    // Which feeds carry full posts for the reader view.
    await expect(page.locator(".source-status", { hasText: "with the full post, readable here" }).first()).toBeVisible();
    await expect(page.locator(".source-status", { hasText: "Summaries only" }).first()).toBeVisible();
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

  test("asks for a longer query instead of saying nothing matches", async ({ page }) => {
    await page.goto("/search?q=a");
    await expect(page.getByText("Use at least two letters or digits.")).toBeVisible();
    await expect(page.locator(".story")).toHaveCount(0);
  });

  test("puts the query in the page title", async ({ page }) => {
    await page.goto("/search?q=openai");
    await expect(page).toHaveTitle(/“openai”: search/);
  });

  test("treats markup in the query as text", async ({ page }) => {
    await page.goto("/search?q=%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("<img src=x onerror=alert(1)>");
    await expect(page.locator("main img")).toHaveCount(0);
  });
});

test.describe("older pages", () => {
  test("the front page goes on to older stories, and back", async ({ page }) => {
    await page.goto("/");
    const pager = page.getByRole("navigation", { name: "Pages" });
    await expect(pager.getByText(/^Page 1 of \d+$/)).toBeVisible();
    await expect(pager.getByRole("link", { name: /Newer stories/ })).toHaveCount(0);
    await pager.getByRole("link", { name: /Older stories/ }).click();
    await expect(page).toHaveURL(/\/\?page=2$/);
    await expect(page.getByRole("heading", { level: 1, name: "Older AI news" })).toBeVisible();
    // The lead story and the "new since" note belong to page 1 only.
    await expect(page.locator(".lead")).toHaveCount(0);
    await expect(page.locator(".story")).not.toHaveCount(0);
    await page.getByRole("navigation", { name: "Pages" }).getByRole("link", { name: /Newer stories/ }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("later pages have their own title and stay out of search results", async ({ page }) => {
    await page.goto("/?page=2");
    await expect(page).toHaveTitle(/Older AI news \(page 2\)/);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/\?page=2$/);
  });

  test("page numbers that aren't numbers are 404s, rendered on the server", async ({ request }) => {
    for (const path of ["/?page=0", "/?page=abc", "/labs?page=1.5", "/topic/models?page=-1", "/search?q=ai&page=x"]) {
      const response = await request.get(path);
      expect(response.status(), path).toBe(404);
      expect(await response.text(), path).toMatch(/<h1[^>]*>Page not found<\/h1>/);
    }
  });

  test("a page past the end goes to the last page there is", async ({ page }) => {
    await page.goto("/labs?page=999");
    await expect(page).toHaveURL(/\/labs(\?page=\d+)?$/);
    await expect(page.locator(".story")).not.toHaveCount(0);
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
    expect(sitemap.match(/<url>/g)).toHaveLength(1 + 1 + 8 + SOURCES.length + 2);
    expect(sitemap).not.toContain("/search");
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Sitemap: http://localhost:3000/sitemap.xml");
    const feed = await request.get("/feed.xml");
    expect(feed.headers()["content-type"]).toContain("application/rss+xml");
    expect((await feed.text()).match(/<item>/g)).toHaveLength(50);
  });

  test("addresses with broken escapes are 404s, not server errors", async ({ request }) => {
    for (const path of ["/topic/%E0%A4%A", "/source/%ZZ", "/read/%ZZ", "/%ZZ"]) {
      expect((await request.get(path)).status(), path).toBe(404);
    }
  });

  test("unknown pages return 404 with a way back", async ({ page, request }) => {
    for (const path of ["/topic/nope", "/source/nope", "/nope"]) {
      expect((await request.get(path)).status(), path).toBe(404);
    }
    await page.goto("/topic/nope");
    await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
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

test.describe("theme", () => {
  const background = (page: Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const LIGHT = "rgb(243, 245, 249)";
  const DARK = "rgb(10, 15, 34)";

  test("follows the system until the reader picks a theme, and remembers the choice", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    const theme = page.getByRole("group", { name: "Theme" });
    await expect(theme.getByRole("radio", { name: "System" })).toBeChecked();
    expect(await background(page)).toBe(LIGHT);

    await theme.getByTitle("Dark theme").click();
    await expect(theme.getByRole("radio", { name: "Dark" })).toBeChecked();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    expect(await background(page)).toBe(DARK);
    expect(await page.evaluate(() => localStorage.getItem("tensorwire:theme"))).toBe("dark");
    await expect(page.locator('meta[name="theme-color"]').first()).toHaveAttribute("content", "#0A0F22");

    // The choice survives a reload and a visit to another page.
    await page.reload();
    await expect(page.getByRole("radio", { name: "Dark" })).toBeChecked();
    await page.getByRole("link", { name: "Sources", exact: true }).click();
    await expect(page).toHaveURL(/\/sources$/);
    expect(await background(page)).toBe(DARK);

    // Back to the system setting: the saved choice is removed.
    await page.getByRole("group", { name: "Theme" }).getByTitle("System theme").click();
    await expect(page.locator("html")).not.toHaveAttribute("data-theme");
    expect(await page.evaluate(() => localStorage.getItem("tensorwire:theme"))).toBeNull();
    expect(await background(page)).toBe(LIGHT);
  });

  test("a light choice wins over a dark system", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    expect(await background(page)).toBe(DARK);
    await page.getByRole("group", { name: "Theme" }).getByTitle("Light theme").click();
    expect(await background(page)).toBe(LIGHT);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe("light");
  });

  test("applies a saved theme before the page's JavaScript runs", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("tensorwire:theme", "dark"));
    // Block the app's scripts: only the inline head script can set the theme now.
    await page.route("**/_next/static/**/*.js", (route) => route.abort());
    page.removeAllListeners("console");
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    expect(await background(page)).toBe(DARK);
    // Without the app's JavaScript the switch can't work, so it isn't shown.
    await expect(page.getByRole("group", { name: "Theme" })).toBeHidden();
  });

  test("a choice made in another tab applies here too", async ({ page, context }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    await expect(page.locator(".theme-switch[data-ready]")).toBeVisible();
    const other = await context.newPage();
    await other.goto("/about");
    await other.getByRole("group", { name: "Theme" }).getByTitle("Dark theme").click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.getByRole("radio", { name: "Dark" })).toBeChecked();
    await other.close();
  });

  test("works from the keyboard", async ({ page, isMobile }) => {
    test.skip(isMobile, "Keyboard navigation is a desktop check");
    await page.goto("/");
    await page.getByRole("radio", { name: "System" }).focus();
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByRole("radio", { name: "Dark" })).toBeChecked();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  for (const scheme of ["dark", "light"] as const) {
    test(`is accessible in the ${scheme} theme and fits the screen`, async ({ page }) => {
      await page.addInitScript((value) => localStorage.setItem("tensorwire:theme", value), scheme);
      await page.emulateMedia({ colorScheme: scheme === "dark" ? "light" : "dark" });
      for (const path of ["/", "/topic/models", "/sources", "/search?q=model", "/no-such-page"]) {
        await page.goto(path);
        await expect(page.locator("html")).toHaveAttribute("data-theme", scheme);
        await expectAccessible(page);
        await noHorizontalScroll(page);
      }
    });
  }
});

test.describe("reader view", () => {
  // In the sample data, the lead story's feed carries full text; most stories carry only a summary.
  async function openReader(page: Page) {
    await page.goto("/");
    const link = page.locator(".lead").getByRole("link", { name: /Read here/ });
    await expect(link).toContainText(/\d+ min/);
    await link.click();
    await expect(page).toHaveURL(/\/read\/[a-z0-9]+$/);
  }

  test("offers the reader view only where the feed has the post's text", async ({ page }) => {
    await page.goto("/");
    const links = page.getByRole("link", { name: /Read here/ });
    expect(await links.count()).toBeGreaterThan(0);
    expect(await links.count()).toBeLessThan(await page.locator(".story").count());
  });

  test("every story has a button for its original site, and readable ones a reader button too", async ({ page }) => {
    await page.goto("/");
    const rows = page.locator(".story");
    const count = await rows.count();
    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      const original = row.getByRole("link", { name: /^Read on / });
      await expect(original).toHaveCount(1);
      await expect(original).toHaveAttribute("href", (await row.locator(".story-title a").getAttribute("href"))!);
    }
    // Both buttons sit together under the summary, the reader one first.
    const both = page.locator(".story-actions", { has: page.locator(".reader-link") }).first();
    await expect(both.getByRole("link")).toHaveText([/^Read here.*\d+ min$/, /^Read on .+ ↗$/]);
    // The buttons keep their size next to a long "Also reported by" list (they once stretched to fill it).
    for (const box of await page.locator(".lead .story-actions a").evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height))) {
      expect(box).toBeLessThan(60);
    }
    // The lead gets the same pair; "Read on" goes where the headline goes.
    const lead = page.locator(".lead");
    await expect(lead.locator(".story-actions .reader-link")).toHaveAttribute("href", /^\/read\//);
    await expect(lead.getByRole("link", { name: /^Read on / })).toHaveAttribute(
      "href",
      (await lead.locator(".lead-title a").getAttribute("href"))!,
    );
  });

  test("shows the post with nothing else around it", async ({ page }) => {
    await openReader(page);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("FlashProve");
    await expect(page.getByText(/\d+ min read/)).toBeVisible();
    const body = page.locator(".reader-body");
    await expect(body.getByRole("heading", { name: "What changes" })).toBeVisible();
    await expect(body.getByRole("listitem")).toHaveCount(3);
    // No site navigation, search, sidebar or footer.
    await expect(page.getByRole("navigation")).toHaveCount(0);
    await expect(page.getByRole("search")).toHaveCount(0);
    await expect(page.locator(".column-side, .footer")).toHaveCount(0);
    // A way back, and the original.
    await expect(page.getByRole("link", { name: "Back to Tensorwire" })).toHaveAttribute("href", "/");
    await expect(page.getByRole("link", { name: "Read it on MarkTechPost" })).toHaveAttribute("href", /marktechpost\.com/);
    await expect(page.getByText("Images, videos and embeds are on the original post.")).toBeVisible();
  });

  test("keeps only safe text from the feed", async ({ page }) => {
    await openReader(page);
    const body = page.locator(".reader-body");
    await expect(body.locator("script, style, iframe, img, figure, [onclick], [style]")).toHaveCount(0);
    await expect(body).not.toContainText("Figure 1");
    await expect(body).not.toContainText("appeared first on");
    expect(await page.title()).not.toBe("hacked");
    // Relative links point at the publisher's site and don't pass on ranking.
    const related = body.getByRole("link", { name: "A related post" });
    await expect(related).toHaveAttribute("href", "https://www.marktechpost.com/related-post");
    await expect(related).toHaveAttribute("rel", "nofollow noopener noreferrer");
  });

  test("is kept out of search engines, which should find the publisher's page", async ({ page }) => {
    await openReader(page);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /marktechpost\.com/);
    const sitemap = await (await page.request.get("/sitemap.xml")).text();
    expect(sitemap).not.toContain("/read/");
  });

  test("remembers text size and typeface, applied before the page paints", async ({ page }) => {
    await openReader(page);
    const size = () => page.locator(".reader-body").evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    const before = await size();
    await page.getByRole("button", { name: "Larger text" }).click();
    expect(await size()).toBeGreaterThan(before);
    await page.getByRole("group", { name: "Typeface" }).getByTitle("Sans-serif typeface").click();
    await expect(page.locator("html")).toHaveAttribute("data-reader-font", "sans");

    // Reload with the app's scripts blocked: the head script alone restores both settings.
    await page.route("**/_next/static/**/*.js", (route) => route.abort());
    page.removeAllListeners("console");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-reader-size", "l");
    await expect(page.locator("html")).toHaveAttribute("data-reader-font", "sans");
    expect(await size()).toBeGreaterThan(before);
  });

  test("text size stops at the smallest and largest steps", async ({ page }) => {
    await openReader(page);
    const smaller = page.getByRole("button", { name: "Smaller text" });
    await smaller.click();
    await expect(smaller).toBeDisabled();
    const larger = page.getByRole("button", { name: "Larger text" });
    for (let i = 0; i < 3; i++) await larger.click();
    await expect(larger).toBeDisabled();
  });

  test("a story without its text in the feed sends you to the original", async ({ page, request }) => {
    await page.goto("/");
    // Story ids are derived from the article URL; take a row without a reader link.
    const row = page.locator(".story", { hasNot: page.locator(".reader-link") }).first();
    const url = await row.locator(".story-title a").getAttribute("href");
    const id = await page.evaluate(async (href) => {
      const u = new URL(href!);
      const key = `${u.hostname.replace(/^www\./, "")}${u.pathname.replace(/\/+$/, "") || "/"}${u.search}`.toLowerCase();
      let hash = 0x811c9dc5;
      for (let i = 0; i < key.length; i++) {
        hash ^= key.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
      }
      return (hash >>> 0).toString(36);
    }, url);
    const response = await request.get(`/read/${id}`, { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(response.headers().location).toBe(url);
  });

  test("an expired story is a 404 with its own title, kept out of search engines", async ({ request }) => {
    const response = await request.get("/read/zzzzzz");
    expect(response.status()).toBe(404);
    const html = await response.text();
    expect(html).toMatch(/<title>Page not found · Tensorwire<\/title>/);
    expect(html).toMatch(/<meta name="robots" content="noindex"/);
  });

  test("unknown or expired stories return 404", async ({ request }) => {
    for (const path of ["/read/zzzzzzz", "/read/not-an-id!"]) {
      expect((await request.get(path)).status(), path).toBe(404);
    }
  });

  for (const scheme of ["light", "dark"] as const) {
    test(`is accessible in the ${scheme} theme and fits the screen`, async ({ page }) => {
      await page.addInitScript((value) => localStorage.setItem("tensorwire:theme", value), scheme);
      await openReader(page);
      await expect(page.locator(".reader-controls[data-ready]")).toBeVisible();
      await expectAccessible(page);
      await noHorizontalScroll(page);
    });
  }

  test("can be read without JavaScript", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/");
    await page.locator(".lead").getByRole("link", { name: /Read here/ }).click();
    await expect(page.locator(".reader-body")).toContainText("sample text");
    await expect(page.getByRole("button", { name: "Larger text" })).toBeHidden();
    await context.close();
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
