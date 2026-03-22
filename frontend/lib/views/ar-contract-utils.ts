import type { ArContractStatus } from "./ar";

function daysFrom(isoDate: string): number {
  const target = new Date(`${isoDate}T12:00:00`);
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Math.ceil(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
}

export function contractRenewalAlert(
  nextRenewalDate: string,
  status: ArContractStatus
): "30" | "60" | null {
  if (status !== "active") return null;
  const d = daysFrom(nextRenewalDate);
  if (d <= 30 && d >= 0) return "30";
  if (d <= 60 && d > 30) return "60";
  return null;
}
