"use client";

import type { MouseEvent } from "react";
import { useState } from "react";
import {
  IconBookmark,
  IconBookmarkFilled,
  IconCompare,
} from "@/components/storefront/icons";
import { useStorefrontLists } from "@/components/storefront/storefront-lists-context";
import type { StorefrontVehicleLite } from "@/lib/storefront/storefront-vehicle-lite";

type VehicleListActionsProps = {
  vehicle: StorefrontVehicleLite;
  /** Overlay on card image — save only (compare is on the tags row). */
  variant?: "card" | "detail";
};

/**
 * Salvate on card image / Compară+Salvează on detail.
 * Compare on catalog cards uses VehicleCardCompareButton (tags row).
 */
export function VehicleListActions({ vehicle, variant = "card" }: VehicleListActionsProps) {
  const { isSaved, isCompared, toggleSaved, toggleCompare } = useStorefrontLists();
  const [hint, setHint] = useState<string | null>(null);
  const saved = isSaved(vehicle.slug);
  const compared = isCompared(vehicle.slug);

  function onCompare(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    const result = toggleCompare(vehicle);
    setHint(result.message ?? null);
  }

  function onSave(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    toggleSaved(vehicle);
    setHint(null);
  }

  if (variant === "detail") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onCompare}
          className="inline-flex min-h-11 items-center gap-2 rounded-[var(--sf-radius)] border border-[var(--sf-border)] bg-white px-4 text-sm font-semibold text-[var(--sf-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-accent)]"
          aria-pressed={compared}
        >
          <IconCompare size={18} />
          {compared ? "În comparație" : "Compară"}
        </button>
        {hint ? <p className="w-full text-xs text-[var(--sf-danger)]">{hint}</p> : null}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={onSave}
        className="absolute top-3 right-3 z-10 inline-flex size-9 items-center justify-center rounded-full bg-white/95 text-[var(--sf-accent)] shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-accent)]"
        aria-pressed={saved}
        aria-label={saved ? "Elimină din salvate" : "Salvează"}
      >
        {saved ? <IconBookmarkFilled size={16} /> : <IconBookmark size={16} />}
      </button>
    </>
  );
}

/** Compact Compară control for the catalog card tags row. */
export function VehicleCardCompareButton({ vehicle }: { vehicle: StorefrontVehicleLite }) {
  const { isCompared, toggleCompare } = useStorefrontLists();
  const [hint, setHint] = useState<string | null>(null);
  const compared = isCompared(vehicle.slug);

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          const result = toggleCompare(vehicle);
          setHint(result.message ?? null);
        }}
        className={`inline-flex min-h-8 items-center gap-1 rounded-full px-2.5 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-accent)] ${
          compared
            ? "bg-[var(--sf-accent)] text-white"
            : "border border-[var(--sf-border)] bg-white text-[var(--sf-text)]"
        }`}
        aria-pressed={compared}
        aria-label={compared ? "Elimină din comparație" : "Adaugă la comparație"}
      >
        <IconCompare size={14} />
        Compară
      </button>
      {hint ? (
        <p className="absolute right-0 bottom-full mb-1 w-max max-w-[12rem] rounded-md bg-white px-2 py-1 text-[11px] font-medium text-[var(--sf-danger)] shadow-sm ring-1 ring-[var(--sf-border)]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function VehicleSaveHeaderButton({ vehicle }: { vehicle: StorefrontVehicleLite }) {
  const { isSaved, toggleSaved } = useStorefrontLists();
  const saved = isSaved(vehicle.slug);

  return (
    <button
      type="button"
      onClick={() => toggleSaved(vehicle)}
      className="inline-flex size-10 items-center justify-center rounded-full border border-[var(--sf-border)] bg-white text-[var(--sf-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-accent)]"
      aria-pressed={saved}
      aria-label={saved ? "Elimină din salvate" : "Salvează"}
      style={saved ? { color: "var(--sf-accent)" } : undefined}
    >
      {saved ? <IconBookmarkFilled size={18} /> : <IconBookmark size={18} />}
    </button>
  );
}
