/**
 * Shared General Ledger table chrome: white surfaces with teal hover (matches
 * active Overview nav: `--brand-primary-subtle`).
 */
import { LEDGER_TABLE_BODY_ROW } from "@/lib/ledger-table-row-styles";

export const glTableContainer =
  "overflow-hidden rounded-xl border border-slate-100 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]";

export const glTableHeaderRow =
  "border-slate-100 bg-white hover:bg-white";

export const glTableBodyRow = LEDGER_TABLE_BODY_ROW;

/** Loading / empty rows — white, no teal hover flash on static content */
export const glTablePlaceholderRow =
  "border-slate-100 bg-white hover:bg-white";
