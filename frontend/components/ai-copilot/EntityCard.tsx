"use client";

import type { EntityCard as EntityCardType } from "@/types/chat";

interface EntityCardProps {
  entityCard: EntityCardType;
  entitySelected: boolean;
  onConfirm: (entity: { name: string; vat: string }) => void;
}

export function EntityCard({
  entityCard,
  entitySelected,
  onConfirm,
}: EntityCardProps) {
  return (
    <button
      className={`w-full text-left rounded-xl border p-4 transition-all duration-200 shadow ${entitySelected
          ? "border-entity-card-selected-border bg-entity-card-selected-bg shadow-md"
          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
        }`}
      onClick={() =>
        onConfirm({
          name: entityCard.name,
          vat: entityCard.vat,
        })
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="text-slate-900 font-semibold">{entityCard.name}</div>
        <span className="inline-flex items-center px-2 py-0.5 text-xs rounded-full bg-entity-card-status-bg text-entity-card-status-text">
          {entityCard.status}
        </span>
      </div>
      <div className="text-slate-500 text-sm mt-1">
        Distinctive title: {entityCard.distinctiveTitle}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-slate-700 text-sm mt-3">
        <div>
          <span className="text-slate-500">GEMI number:</span> {entityCard.gemi}
        </div>
        <div>
          <span className="text-slate-500">EUID:</span> {entityCard.euid}
        </div>
        <div>
          <span className="text-slate-500">VAT:</span> {entityCard.vat}
        </div>
        <div>
          <span className="text-slate-500">Legal form:</span>{" "}
          {entityCard.legalForm}
        </div>
        <div>
          <span className="text-slate-500">Incorporation date:</span>{" "}
          {entityCard.incorporationDate}
        </div>
        <div>
          <span className="text-slate-500">Address:</span> {entityCard.address}
        </div>
        <div>
          <span className="text-slate-500">Website:</span> {entityCard.website}
        </div>
        <div>
          <span className="text-slate-500">e-shop:</span> ({entityCard.eShop})
        </div>
      </div>
    </button>
  );
}

