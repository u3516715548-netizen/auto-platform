"use client";

import Link from "next/link";
import { IconClose, IconCompare } from "@/components/storefront/icons";
import { useStorefrontLists } from "@/components/storefront/storefront-lists-context";
import { publicComparePath } from "@/lib/storefront/paths";
import { COMPARE_MIN } from "@/lib/storefront/storefront-vehicle-lite";

/** Floating CTA when user has vehicles in compare list (catalog / detail). */
export function CompareFloatingBar() {
  const { compare, ready } = useStorefrontLists();
  if (!ready || compare.length === 0) return null;

  const canOpen = compare.length >= COMPARE_MIN;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-20 z-30 flex justify-center px-3 md:bottom-6"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="pointer-events-auto flex max-w-md items-center gap-2 rounded-full border border-[var(--sf-border)] bg-white px-2 py-2 shadow-lg">
        <span className="inline-flex size-9 items-center justify-center rounded-full bg-[var(--sf-surface-muted)] text-[var(--sf-text)]">
          <IconCompare size={16} />
        </span>
        <p className="min-w-0 flex-1 px-1 text-sm font-semibold text-[var(--sf-text)]">
          {compare.length} {compare.length === 1 ? "mașină" : "mașini"} în comparație
          {!canOpen ? (
            <span className="block text-xs font-normal text-[var(--sf-text-muted)]">
              Selectează încă cel puțin o mașină
            </span>
          ) : null}
        </p>
        {canOpen ? (
          <Link
            href={publicComparePath()}
            className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-full px-4 text-sm font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-accent)]"
            style={{ backgroundColor: "var(--sf-accent)" }}
          >
            Compară
          </Link>
        ) : (
          <span className="inline-flex size-10 items-center justify-center text-[var(--sf-text-muted)]" aria-hidden>
            <IconClose size={16} />
          </span>
        )}
      </div>
    </div>
  );
}
