"use client";

/**
 * The book's central figure: every word in the language sits under a bell
 * curve of how often it is used. Learning starts at the apex (quiero, tengo
 * que, necesito) and spreads outward toward the rarely used tails.
 *
 * Each unit is a slice under the curve, placed outward from the centre in
 * curriculum order. A slice fills in agave green as its words get stronger.
 */
export function BellCurve({
  slices,
  onPick,
}: {
  slices: { id: string; title: string; strength: number; next?: boolean }[];
  onPick?: (id: string) => void;
}) {
  const W = 640;
  const H = 250;
  const base = H - 36;
  const top = 18;
  const sigma = 0.19;
  const y = (x: number) => base - (base - top) * Math.exp(-((x - 0.5) ** 2) / (2 * sigma ** 2));

  // Slice k sits at offset ceil(k/2) from centre, alternating right/left.
  const n = slices.length;
  const width = 0.86 / Math.max(n, 1);
  const centerOf = (k: number) => {
    if (k === 0) return 0.5;
    const step = Math.ceil(k / 2);
    const side = k % 2 === 1 ? 1 : -1;
    return 0.5 + side * step * width;
  };

  const curve: string[] = [];
  for (let s = 0; s <= 120; s++) {
    const x = s / 120;
    curve.push(`${s === 0 ? "M" : "L"}${(x * W).toFixed(1)},${y(x).toFixed(1)}`);
  }
  const curvePath = curve.join(" ");

  const slicePath = (cx: number) => {
    const x0 = cx - width / 2;
    const x1 = cx + width / 2;
    const pts: string[] = [`M${x0 * W},${base}`];
    for (let s = 0; s <= 10; s++) {
      const x = x0 + ((x1 - x0) * s) / 10;
      pts.push(`L${(x * W).toFixed(1)},${y(x).toFixed(1)}`);
    }
    pts.push(`L${x1 * W},${base} Z`);
    return pts.join(" ");
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label="Progress under the bell curve of word usage">
      <defs>
        <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="var(--color-line)" strokeWidth="2" />
        </pattern>
      </defs>
      <path d={`${curvePath} L${W},${base} L0,${base} Z`} fill="url(#hatch)" />
      {slices.map((s, k) => {
        const cx = centerOf(k);
        const d = slicePath(cx);
        return (
          <g key={s.id} className={onPick ? "cursor-pointer" : ""} onClick={() => onPick?.(s.id)}>
            <title>{`${s.title}: ${Math.round(s.strength * 100)}% strong`}</title>
            <path d={d} fill="white" stroke="var(--color-paper)" strokeWidth="2" />
            <path d={d} fill="var(--color-agave)" fillOpacity={0.1 + 0.9 * s.strength} stroke="var(--color-paper)" strokeWidth="2" style={{ transition: "fill-opacity 400ms" }} />
            {s.next && <path d={d} fill="none" stroke="var(--color-marigold)" strokeWidth="3" />}
          </g>
        );
      })}
      <path d={curvePath} fill="none" stroke="var(--color-ink)" strokeWidth="2.5" />
      <line x1="0" x2={W} y1={base} y2={base} stroke="var(--color-ink)" strokeWidth="1.5" />
      <text x={W / 2} y={base + 26} textAnchor="middle" className="fill-ink font-display" fontSize="20" fontWeight="700">
        most used
      </text>
      <text x={4} y={base + 26} className="fill-ink-soft" fontSize="17">
        new words
      </text>
      <text x={W - 4} y={base + 26} textAnchor="end" className="fill-ink-soft" fontSize="17">
        archaic
      </text>
    </svg>
  );
}
