import { NextResponse, type NextRequest } from "next/server";

import { measurementId } from "@/lib/analytics";
import { buildCsp } from "@/lib/csp";
import { sourceBySlug } from "@/lib/sources";
import { topicBySlug } from "@/lib/topics";

const SECTION = /^\/(topic|source)\/([^/]+)\/?$/;

/**
 * A fresh nonce per request for a strict Content Security Policy: only scripts and styles
 * that Next.js itself rendered with the nonce may run.
 */
export function proxy(request: NextRequest) {
  // Unknown topics and sources get a real 404 status before any HTML is streamed.
  const section = SECTION.exec(request.nextUrl.pathname);
  if (section) {
    const slug = decodeURIComponent(section[2]);
    const known = section[1] === "topic" ? topicBySlug(slug) : sourceBySlug(slug);
    if (!known) return NextResponse.rewrite(new URL("/_not-a-page", request.url));
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";
  const csp = buildCsp({ nonce, dev: isDev, analytics: measurementId() !== null });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      source:
        "/((?!api|_next/static|_next/image|favicon.ico|icon.svg|apple-icon|feed.xml|sitemap.xml|robots.txt|manifest.webmanifest|opengraph-image).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
