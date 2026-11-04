import type { MetadataRoute } from "next";

import { SITE_NAME, TAGLINE } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME}: AI news`,
    short_name: SITE_NAME,
    description: TAGLINE,
    start_url: "/",
    display: "standalone",
    background_color: "#101735",
    theme_color: "#101735",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
