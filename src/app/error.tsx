"use client";

import Link from "next/link";

/** Something failed while building the page. The feeds are cached, so a retry usually works. */
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main" className="error-page">
      <h1>The news didn&apos;t load</h1>
      <p>Something went wrong while putting this page together. It&apos;s usually brief.</p>
      <p className="actions">
        <button type="button" className="button" onClick={reset}>
          Try again
        </button>
        <Link href="/" className="button button-quiet">
          Go to the front page
        </Link>
      </p>
    </main>
  );
}
