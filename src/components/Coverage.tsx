const CELLS = 4;

/**
 * How many sources reported a story, as a row of cells: one lit cell per source, up to four.
 * The count is the information; the cells make it scannable down the page.
 */
export function Coverage({ count }: { count: number }) {
  const label = count === 1 ? "Reported by 1 source" : `Reported by ${count} sources`;
  return (
    <span className="cells" role="img" aria-label={label} title={label}>
      {Array.from({ length: CELLS }, (_, i) => (
        <span key={i} className={i < count ? "cell cell-on" : "cell"} />
      ))}
    </span>
  );
}
