import type { MetadataRoute } from "next";

import { absolute } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    // Search result pages are crawlable but carry noindex, which crawlers can only see if allowed in.
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: absolute("/sitemap.xml"),
  };
}
