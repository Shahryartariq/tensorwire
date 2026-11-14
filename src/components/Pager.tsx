import Link from "next/link";

import { pageHref } from "@/lib/paging";

/** "Newer stories · Page 2 of 4 · Older stories" under a list. Nothing when it fits on one page. */
export function Pager({
  path,
  page,
  pages,
  query,
}: {
  path: string;
  page: number;
  pages: number;
  query?: Record<string, string>;
}) {
  if (pages <= 1) return null;
  return (
    <nav className="pager" aria-label="Pages">
      {page > 1 ? (
        <Link href={pageHref(path, page - 1, query)} rel="prev" className="button button-quiet">
          <span aria-hidden="true">← </span>Newer stories
        </Link>
      ) : (
        <span />
      )}
      <p className="pager-count">
        Page {page} of {pages}
      </p>
      {page < pages ? (
        <Link href={pageHref(path, page + 1, query)} rel="next" className="button button-quiet">
          Older stories<span aria-hidden="true"> →</span>
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
