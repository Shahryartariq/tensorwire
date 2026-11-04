/** Hosts Google Analytics 4 loads its script from and sends measurements to. */
const GA_SCRIPT = ["https://www.googletagmanager.com"];
const GA_CONNECT = [
  "https://*.google-analytics.com",
  "https://*.analytics.google.com",
  "https://*.googletagmanager.com",
];

/**
 * The Content Security Policy for one request. Only scripts and styles carrying this
 * request's nonce may run; 'strict-dynamic' lets those scripts load what they need.
 */
export function buildCsp({ nonce, dev, analytics }: { nonce: string; dev: boolean; analytics: boolean }): string {
  return [
    "default-src 'self'",
    ["script-src 'self'", `'nonce-${nonce}'`, "'strict-dynamic'", ...(analytics ? GA_SCRIPT : []), ...(dev ? ["'unsafe-eval'"] : [])].join(" "),
    `style-src 'self' ${dev ? "'unsafe-inline'" : `'nonce-${nonce}'`}`,
    ["img-src 'self' data: blob:", ...(analytics ? GA_CONNECT : [])].join(" "),
    "font-src 'self'",
    ["connect-src 'self'", ...(analytics ? GA_CONNECT : [])].join(" "),
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(dev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}
