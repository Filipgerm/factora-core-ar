import type { HomeActivityItem } from "@/lib/views/home";
import type { TransactionsResponse } from "@/lib/schemas/dashboard";

/** Map SaltEdge-style transactions into home activity feed items. */
export function transactionsToActivityItems(
  txs: TransactionsResponse[],
  limit = 12
): HomeActivityItem[] {
  return txs.slice(0, limit).map((t) => ({
    id: t.id,
    at: t.made_on.includes("T") ? t.made_on : `${t.made_on}T12:00:00.000Z`,
    message:
      t.amount < 0
        ? `${t.description} · ${t.currency_code} ${Math.abs(t.amount).toFixed(2)}`
        : `${t.description} · +${t.currency_code} ${t.amount.toFixed(2)}`,
    icon: "banknote" as const,
  }));
}
