import localFont from "next/font/local";

/**
 * Self-hosted variable fonts (Latin). next/font sizes a local fallback to match each font's
 * metrics, so text doesn't jump when the web font arrives.
 */
export const sans = localFont({
  src: "../fonts/schibsted-grotesk-latin-wght-normal.woff2",
  weight: "400 900",
  variable: "--font-sans",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "Segoe UI", "Roboto", "sans-serif"],
});
