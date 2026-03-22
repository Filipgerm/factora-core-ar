import type { HomeKpiFormatKey } from "@/lib/views/home";

const eurFmt = new Intl.NumberFormat("el-GR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export function formatKpiAnimatedValue(
  v: number,
  key: HomeKpiFormatKey
): string {
  switch (key) {
    case "eur_millions":
      return `€${v.toFixed(2)}M`;
    case "eur_integer":
      return eurFmt.format(Math.round(v));
    case "months_1dp":
      return `${v.toFixed(1)} mo`;
    default:
      return String(v);
  }
}
