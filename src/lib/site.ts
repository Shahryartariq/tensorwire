export const SITE_NAME = "Tensorwire";

export const TAGLINE = "AI news from the labs and the press, in one fast feed.";

export const SITE_DESCRIPTION =
  "Today's AI news in one place: model releases, research, agents, chips and policy from OpenAI, Google DeepMind, Hugging Face, TechCrunch, The Verge and 13 more sources. Updated every 15 minutes.";

export const AUTHOR = { name: "Muhammad Shehryar", url: "https://github.com/Shahryartariq" };
export const SOURCE_URL = "https://github.com/Shahryartariq/tensorwire";

export const PRODUCTION_URL = "https://tensorwire.vercel.app";

/**
 * The public address of the site, for canonical links, the sitemap and social cards.
 * SITE_URL wins; any Vercel deployment (production or preview) points search engines at production.
 */
export function siteUrl(): URL {
  const explicit = process.env.SITE_URL?.trim();
  if (explicit) return new URL(explicit);
  if (process.env.VERCEL) return new URL(PRODUCTION_URL);
  return new URL("http://localhost:3000");
}

export function absolute(path: string): string {
  return new URL(path, siteUrl()).toString();
}

/**
 * Per-page metadata pieces. A page's own `alternates` and `openGraph` replace the layout's,
 * so the RSS link and the default social image are added back here.
 */
export function pageMeta(path: string, title: string, description: string, image = "/opengraph-image") {
  return {
    alternates: {
      canonical: path,
      types: { "application/rss+xml": [{ url: "/feed.xml", title: `${SITE_NAME}: latest AI news` }] },
    },
    openGraph: {
      type: "website" as const,
      siteName: SITE_NAME,
      locale: "en_US",
      title,
      description,
      url: path,
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image" as const, title, description, images: [image] },
  };
}

/** JSON for a <script type="application/ld+json">, safe against "</script>" in the data. */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
