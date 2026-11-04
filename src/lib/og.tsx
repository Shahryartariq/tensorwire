import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

const NAVY = "#101735";
const DIM = "#3A4570";
const MARK = "#FFE14D";

function Grid({ cell, gap }: { cell: number; gap: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap }}>
      {[0, 1, 2].map((row) => (
        <div key={row} style={{ display: "flex", gap }}>
          {[0, 1, 2].map((col) => (
            <div key={col} style={{ width: cell, height: cell, borderRadius: cell / 5, background: row === 1 ? MARK : DIM }} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** The social card: navy band, the mark, a large title and one line under it. */
export function ogImage(title: string, subtitle: string) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: NAVY,
          color: "#fff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 44, fontWeight: 700 }}>
          <Grid cell={16} gap={5} />
          Tensorwire
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 88, fontWeight: 700, letterSpacing: -2, lineHeight: 1.02, maxWidth: 1000 }}>{title}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 34, color: "#C9CFE6" }}>
            <div style={{ display: "flex", gap: 6 }}>
              {[MARK, MARK, MARK, DIM].map((c, i) => (
                <div key={i} style={{ width: 18, height: 18, borderRadius: 4, background: c }} />
              ))}
            </div>
            {subtitle}
          </div>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}

export function iconImage(size: number) {
  const cell = Math.round(size * 0.19);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: NAVY }}>
        <Grid cell={cell} gap={Math.round(cell * 0.33)} />
      </div>
    ),
    { width: size, height: size },
  );
}
