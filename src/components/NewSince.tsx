"use client";

import { useEffect, useState } from "react";

const KEY = "tensorwire:seen";

/**
 * Marks stories that arrived since the reader's last visit. Remembers only the time of the
 * newest story seen, on this device. Without JavaScript or storage, nothing changes.
 */
export function NewSince({ newest }: { newest: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let last = 0;
    try {
      last = Number(window.localStorage.getItem(KEY) ?? 0);
    } catch {
      return;
    }
    if (last > 0) {
      const fresh = document.querySelectorAll<HTMLElement>(".story[data-ts]");
      let n = 0;
      fresh.forEach((row) => {
        if (Number(row.dataset.ts) > last) {
          row.classList.add("is-new");
          n++;
        }
      });
      // Reading layout-dependent state after mount is the point of this component.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCount(n);
    }
    try {
      if (newest > last) window.localStorage.setItem(KEY, String(newest));
    } catch {
      // Storage can be full or blocked; the marker is a convenience.
    }
  }, [newest]);

  if (count === 0) return null;
  return (
    <p className="new-since" role="status">
      <span className="new-dot" aria-hidden="true" />
      {count === 1 ? "1 new story" : `${count} new stories`} since your last visit
    </p>
  );
}
