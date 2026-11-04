/** The Tensorwire mark: a 3 × 3 tensor with one row lit, like a line on the wire. */
export function Mark({ size = 22 }: { size?: number }) {
  return (
    <svg className="mark" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {[0, 1, 2].map((row) =>
        [0, 1, 2].map((col) => (
          <rect
            key={`${row}-${col}`}
            x={1 + col * 8}
            y={1 + row * 8}
            width="6"
            height="6"
            rx="1.2"
            className={row === 1 ? "mark-lit" : "mark-cell"}
          />
        )),
      )}
    </svg>
  );
}
