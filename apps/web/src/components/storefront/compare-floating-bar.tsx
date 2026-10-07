"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IconClose, IconCompare } from "@/components/storefront/icons";
import { useStorefrontLists } from "@/components/storefront/storefront-lists-context";
import {
  loadCompareBarDismissed,
  persistCompareBarDismissed,
  shouldAutoShowCompareBar,
} from "@/lib/storefront/compare-bar-dismiss";
import { publicComparePath } from "@/lib/storefront/paths";
import { COMPARE_MIN } from "@/lib/storefront/storefront-vehicle-lite";

export type CompareFloatingBarProps = {
  /** Absolute inside a relative preview shell instead of viewport-fixed. */
  embedded?: boolean;
  /** Demo preview: show CTA without leaving the theme preview. */
  disableNavigation?: boolean;
};

/** @deprecated Prefer shouldAutoShowCompareBar — kept for older tests. */
export function shouldShowCompareBar(count: number, hidden: boolean): boolean {
  return shouldAutoShowCompareBar({ count, dismissed: hidden });
}

export function isCompareCtaEnabled(count: number): boolean {
  return count >= COMPARE_MIN;
}

/**
 * Floating compare tray.
 * Mobile: compact pill (icons + stacked avatars + Compară + X).
 * Desktop: wider tray with labels and per-vehicle remove.
 * X hides the bar without clearing selection; dismiss is persisted until compare is emptied.
 */
export function CompareFloatingBar({
  embedded = false,
  disableNavigation = false,
}: CompareFloatingBarProps = {}) {
  const { compare, ready, removeCompare, tenantSlug } = useStorefrontLists();
  const [dismissed, setDismissed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setDismissed(loadCompareBarDismissed(tenantSlug));
    setHydrated(true);
  }, [tenantSlug]);

  useEffect(() => {
    if (!hydrated) return;
    if (compare.length === 0) {
      persistCompareBarDismissed(tenantSlug, false);
      setDismissed(false);
    }
  }, [compare.length, hydrated, tenantSlug]);

  function hideBar() {
    setDismissed(true);
    persistCompareBarDismissed(tenantSlug, true);
  }

  if (!ready || !hydrated) return null;
  if (!shouldAutoShowCompareBar({ count: compare.length, dismissed })) return null;

  const canOpen = isCompareCtaEnabled(compare.length);
  const positionClass = embedded
    ? "pointer-events-none absolute inset-x-0 bottom-16 z-30 flex justify-center px-3 md:bottom-4"
    : "pointer-events-none fixed inset-x-0 bottom-20 z-30 flex justify-center px-3 md:bottom-6";

  const visibleAvatars = compare.slice(0, 2);
  const extra = compare.length - visibleAvatars.length;

  return (
    <div
      className={positionClass}
      style={embedded ? undefined : { paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* Mobile compact pill */}
      <div
        className="pointer-events-auto flex max-w-full items-center gap-2 rounded-full border border-[var(--sf-border)] bg-white py-1.5 pr-1.5 pl-2.5 shadow-lg md:hidden"
        role="region"
        aria-label="Comparație vehicule"
      >
        <span
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--sf-surface-muted)] text-[var(--sf-text)]"
          aria-hidden
        >
          <IconCompare size={15} />
        </span>
        <div className="flex items-center -space-x-2" aria-hidden>
          {visibleAvatars.map((vehicle) => (
            <span
              key={vehicle.slug}
              className="size-8 overflow-hidden rounded-full border-2 border-white bg-[var(--sf-surface-muted)]"
            >
              {vehicle.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={vehicle.coverImageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full items-center justify-center text-[9px] font-bold text-[var(--sf-text-muted)]">
                  {vehicle.make.charAt(0)}
                </span>
              )}
            </span>
          ))}
          {extra > 0 ? (
            <span className="inline-flex size-8 items-center justify-center rounded-full border-2 border-white bg-[var(--sf-surface-muted)] text-[10px] font-bold text-[var(--sf-text)]">
              +{extra}
            </span>
          ) : null}
        </div>
        <span className="sr-only">
          {compare.length} {compare.length === 1 ? "mașină" : "mașini"} în comparație
        </span>
        {canOpen ? (
          disableNavigation ? (
            <span
              className="inline-flex min-h-9 items-center justify-center rounded-full px-3 text-xs font-bold text-white"
              style={{ backgroundColor: "var(--sf-accent)" }}
            >
              Compară
            </span>
          ) : (
            <Link
              href={publicComparePath()}
              className="inline-flex min-h-9 items-center justify-center rounded-full px-3 text-xs font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-accent)]"
              style={{ backgroundColor: "var(--sf-accent)" }}
            >
              Compară
            </Link>
          )
        ) : (
          <span
            className="inline-flex min-h-9 cursor-not-allowed items-center justify-center rounded-full bg-zinc-200 px-3 text-xs font-bold text-zinc-500"
            aria-disabled="true"
          >
            Compară
          </span>
        )}
        <button
          type="button"
          onClick={hideBar}
          className="inline-flex size-9 items-center justify-center rounded-full text-[var(--sf-text-muted)] hover:bg-[var(--sf-surface-muted)] hover:text-[var(--sf-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-accent)]"
          aria-label="Ascunde bara de comparație"
          title="Ascunde bara (selecțiile rămân)"
        >
          <IconClose size={14} />
        </button>
      </div>

      {/* Desktop wider tray */}
      <div
        className="pointer-events-auto hidden w-full max-w-xl flex-col gap-2 rounded-2xl border border-[var(--sf-border)] bg-white p-3 shadow-lg sm:flex-row sm:items-center md:flex"
        role="region"
        aria-label="Comparație vehicule"
      >
        <div className="flex min-w-0 flex-1 items-start gap-2 sm:items-center">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--sf-surface-muted)] text-[var(--sf-text)]">
            <IconCompare size={16} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[var(--sf-text)]">
              {compare.length} {compare.length === 1 ? "mașină" : "mașini"} în comparație
            </p>
            {!canOpen ? (
              <p className="text-xs text-[var(--sf-text-muted)]">
                Selectează încă cel puțin o mașină
              </p>
            ) : null}
            <ul className="mt-2 flex flex-wrap gap-2">
              {compare.map((vehicle) => {
                const label = `${vehicle.make} ${vehicle.model}`;
                return (
                  <li
                    key={vehicle.slug}
                    className="relative flex items-center gap-1.5 rounded-xl border border-[var(--sf-border)] bg-[var(--sf-surface-muted)] py-1 pr-1 pl-1"
                  >
                    <span className="size-9 overflow-hidden rounded-lg bg-white">
                      {vehicle.coverImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={vehicle.coverImageUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="flex h-full items-center justify-center text-[10px] text-[var(--sf-text-muted)]">
                          —
                        </span>
                      )}
                    </span>
                    <span className="max-w-[6.5rem] truncate text-xs font-medium text-[var(--sf-text)]">
                      {label}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeCompare(vehicle.slug)}
                      className="inline-flex size-8 items-center justify-center rounded-full text-[var(--sf-text-muted)] hover:bg-white hover:text-[var(--sf-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-accent)]"
                      aria-label={`Elimină ${label} din comparație`}
                    >
                      <IconClose size={14} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2">
          {canOpen ? (
            disableNavigation ? (
              <span
                className="inline-flex min-h-10 items-center justify-center rounded-full px-4 text-sm font-bold text-white"
                style={{ backgroundColor: "var(--sf-accent)" }}
                title="Comparație disponibilă pe site-ul public"
              >
                Compară
              </span>
            ) : (
              <Link
                href={publicComparePath()}
                className="inline-flex min-h-10 items-center justify-center rounded-full px-4 text-sm font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-accent)]"
                style={{ backgroundColor: "var(--sf-accent)" }}
              >
                Compară
              </Link>
            )
          ) : (
            <span
              className="inline-flex min-h-10 cursor-not-allowed items-center justify-center rounded-full bg-zinc-200 px-4 text-sm font-bold text-zinc-500"
              aria-disabled="true"
              title="Selectează cel puțin 2 mașini"
            >
              Compară
            </span>
          )}
          <button
            type="button"
            onClick={hideBar}
            className="inline-flex size-10 items-center justify-center rounded-full border border-[var(--sf-border)] text-[var(--sf-text-muted)] hover:text-[var(--sf-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-accent)]"
            aria-label="Ascunde bara de comparație"
            title="Ascunde bara (selecțiile rămân)"
          >
            <IconClose size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
