import type { HomeKpiSparkPoint } from "@/lib/views/home";

const DISPLAY_POINTS = 12;

/** Recharts area/bar need ≥2 distinct x positions; a single month in the P&L window used to yield one point and an invisible chart. */
export function expandSparklineForChart(
  points: HomeKpiSparkPoint[]
): HomeKpiSparkPoint[] {
  if (points.length === 0) {
    return [
      { i: 0, v: 0 },
      { i: 1, v: 0 },
    ];
  }
  if (points.length === 1) {
    const v = points[0].v;
    const start = v * 0.82;
    return Array.from({ length: DISPLAY_POINTS }, (_, idx) => ({
      i: idx,
      v: start + ((v - start) * idx) / (DISPLAY_POINTS - 1),
    }));
  }
  const sorted = [...points].sort((a, b) => a.i - b.i);
  const out: HomeKpiSparkPoint[] = [];
  for (let idx = 0; idx < DISPLAY_POINTS; idx++) {
    const t = idx / (DISPLAY_POINTS - 1);
    const pos = t * (sorted.length - 1);
    const j = Math.floor(pos);
    const frac = pos - j;
    const v0 = sorted[j].v;
    const v1 = sorted[Math.min(j + 1, sorted.length - 1)].v;
    out.push({ i: idx, v: v0 + (v1 - v0) * frac });
  }
  return out;
}
