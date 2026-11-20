import localFont from "next/font/local";

/**
 * The reader view's serif. In its own module: next/font ships every font declared in a module
 * with the pages that import it, so sharing a file with the sans would load it everywhere.
 */
export const serif = localFont({
  src: [
    { path: "../fonts/source-serif-4-latin-wght-normal.woff2", style: "normal" },
    { path: "../fonts/source-serif-4-latin-wght-italic.woff2", style: "italic" },
  ],
  weight: "200 900",
  variable: "--font-serif",
  display: "swap",
  adjustFontFallback: "Times New Roman",
  fallback: ["Georgia", "Times New Roman", "serif"],
});
