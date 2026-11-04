import type { Metadata } from "next";
import Link from "next/link";

import { Frame } from "@/components/Frame";
import { TOPICS } from "@/lib/topics";

export const metadata: Metadata = { title: "Page not found", robots: { index: false } };

export default function NotFound() {
  return (
    <Frame>
      <div className="band band-short">
        <div className="band-inner">
          <h1>This page isn’t on the wire</h1>
          <div className="band-intro">
            <p>The address may be mistyped, or the page has moved. The latest news is on the front page.</p>
          </div>
        </div>
      </div>
      <div className="page-body">
        <p>
          <Link href="/" className="button">
            Go to today’s news
          </Link>
        </p>
        <h2 className="small-heading">Or pick a topic</h2>
        <ul className="inline-links">
          {TOPICS.map((t) => (
            <li key={t.slug}>
              <Link href={`/topic/${t.slug}`}>{t.name}</Link>
            </li>
          ))}
        </ul>
      </div>
    </Frame>
  );
}
