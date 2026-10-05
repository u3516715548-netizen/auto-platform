import type { StorefrontVehicleLite } from "@/lib/storefront/storefront-vehicle-lite";
import { COMPARE_MAX } from "@/lib/storefront/storefront-vehicle-lite";

const SAVED_PREFIX = "ap.sf.saved.v1.";
const COMPARE_PREFIX = "ap.sf.compare.v1.";

function safeParseList(raw: string | null): StorefrontVehicleLite[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is StorefrontVehicleLite =>
        !!item &&
        typeof item === "object" &&
        typeof (item as StorefrontVehicleLite).slug === "string" &&
        typeof (item as StorefrontVehicleLite).make === "string" &&
        typeof (item as StorefrontVehicleLite).model === "string",
    );
  } catch {
    return [];
  }
}

function read(key: string): StorefrontVehicleLite[] {
  if (typeof window === "undefined") return [];
  try {
    return safeParseList(window.localStorage.getItem(key));
  } catch {
    return [];
  }
}

function write(key: string, items: StorefrontVehicleLite[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(items));
  } catch {
    // Quota / private mode — ignore.
  }
}

export function savedStorageKey(tenantSlug: string): string {
  return `${SAVED_PREFIX}${tenantSlug}`;
}

export function compareStorageKey(tenantSlug: string): string {
  return `${COMPARE_PREFIX}${tenantSlug}`;
}

export function loadSavedVehicles(tenantSlug: string): StorefrontVehicleLite[] {
  return read(savedStorageKey(tenantSlug));
}

export function loadCompareVehicles(tenantSlug: string): StorefrontVehicleLite[] {
  return read(compareStorageKey(tenantSlug)).slice(0, COMPARE_MAX);
}

export function persistSavedVehicles(tenantSlug: string, items: StorefrontVehicleLite[]) {
  write(savedStorageKey(tenantSlug), items);
}

export function persistCompareVehicles(tenantSlug: string, items: StorefrontVehicleLite[]) {
  write(compareStorageKey(tenantSlug), items.slice(0, COMPARE_MAX));
}

/** Upsert by slug; newest first for saved. */
export function upsertBySlug(
  list: StorefrontVehicleLite[],
  vehicle: StorefrontVehicleLite,
  max?: number,
): StorefrontVehicleLite[] {
  const next = [vehicle, ...list.filter((v) => v.slug !== vehicle.slug)];
  return max != null ? next.slice(0, max) : next;
}

export function removeBySlug(
  list: StorefrontVehicleLite[],
  slug: string,
): StorefrontVehicleLite[] {
  return list.filter((v) => v.slug !== slug);
}
