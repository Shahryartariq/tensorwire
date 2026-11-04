import "@fontsource-variable/schibsted-grotesk";
import "./globals.css";

import { GoogleAnalytics } from "@next/third-parties/google";
import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";

import { measurementId } from "@/lib/analytics";
import { AUTHOR, SITE_DESCRIPTION, SITE_NAME, siteUrl } from "@/lib/site";

export function generateMetadata(): Metadata {
  const google = process.env.GOOGLE_SITE_VERIFICATION?.trim();
  return {
    metadataBase: siteUrl(),
    title: { default: `${SITE_NAME}: today's AI news`, template: `%s · ${SITE_NAME}` },
    description: SITE_DESCRIPTION,
    applicationName: SITE_NAME,
    authors: [AUTHOR],
    creator: AUTHOR.name,
    keywords: ["AI news", "artificial intelligence news", "LLM news", "AI model releases", "AI research", "OpenAI", "Google DeepMind", "Hugging Face"],
    category: "news",
    formatDetection: { telephone: false, address: false, email: false },
    alternates: { types: { "application/rss+xml": [{ url: "/feed.xml", title: `${SITE_NAME}: latest AI news` }] } },
    openGraph: { type: "website", siteName: SITE_NAME, locale: "en_US", url: "/" },
    twitter: { card: "summary_large_image" },
    ...(google ? { verification: { google } } : {}),
  };
}

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#101735" },
    { media: "(prefers-color-scheme: dark)", color: "#0A0F22" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Reading the request makes every page render per request: the CSP nonce the proxy put in x-nonce
  // is new each time, and the news is fresh (the feeds themselves are cached for 15 minutes).
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const gaId = measurementId();
  return (
    <html lang="en">
      <body>{children}</body>
      {gaId && <GoogleAnalytics gaId={gaId} nonce={nonce} />}
    </html>
  );
}
