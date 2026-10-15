"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  COMPARE_MAX,
  parsePriceEurNumber,
  type StorefrontVehicleLite,
} from "@/lib/storefront/storefront-vehicle-lite";
import {
  loadCompareVehicles,
  loadSavedVehicles,
  persistCompareVehicles,
  persistSavedVehicles,
  removeBySlug,
  upsertBySlug,
} from "@/lib/storefront/storefront-lists-storage";
import { emitMarketingEvent } from "@/lib/marketing/emit-marketing-event";

function vehicleTrackingParams(vehicle: StorefrontVehicleLite) {
  const price = parsePriceEurNumber(vehicle.price);
  return {
    vehicle_slug: vehicle.slug,
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
    ...(vehicle.fuel ? { fuel_type: vehicle.fuel } : {}),
    ...(vehicle.transmission ? { transmission: vehicle.transmission } : {}),
    ...(price > 0 ? { price, currency: "EUR" as const } : {}),
  };
}

type StorefrontListsContextValue = {
  tenantSlug: string;
  ready: boolean;
  saved: StorefrontVehicleLite[];
  compare: StorefrontVehicleLite[];
  isSaved: (slug: string) => boolean;
  isCompared: (slug: string) => boolean;
  toggleSaved: (vehicle: StorefrontVehicleLite) => void;
  removeSaved: (slug: string) => void;
  toggleCompare: (vehicle: StorefrontVehicleLite) => { ok: boolean; message?: string };
  removeCompare: (slug: string) => void;
  clearCompare: () => void;
};

const StorefrontListsContext = createContext<StorefrontListsContextValue | null>(null);

export function StorefrontListsProvider({
  tenantSlug,
  children,
}: {
  tenantSlug: string;
  children: ReactNode;
}) {
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState<StorefrontVehicleLite[]>([]);
  const [compare, setCompare] = useState<StorefrontVehicleLite[]>([]);

  useEffect(() => {
    setSaved(loadSavedVehicles(tenantSlug));
    setCompare(loadCompareVehicles(tenantSlug));
    setReady(true);
  }, [tenantSlug]);

  useEffect(() => {
    if (!ready) return;
    persistSavedVehicles(tenantSlug, saved);
  }, [tenantSlug, saved, ready]);

  useEffect(() => {
    if (!ready) return;
    persistCompareVehicles(tenantSlug, compare);
  }, [tenantSlug, compare, ready]);

  const isSaved = useCallback(
    (slug: string) => saved.some((v) => v.slug === slug),
    [saved],
  );

  const isCompared = useCallback(
    (slug: string) => compare.some((v) => v.slug === slug),
    [compare],
  );

  const toggleSaved = useCallback((vehicle: StorefrontVehicleLite) => {
    let didAdd = false;
    setSaved((prev) => {
      if (prev.some((v) => v.slug === vehicle.slug)) {
        return removeBySlug(prev, vehicle.slug);
      }
      didAdd = true;
      return upsertBySlug(prev, vehicle);
    });
    if (didAdd) {
      emitMarketingEvent("saved_vehicle", {
        ...vehicleTrackingParams(vehicle),
        source_context: "salvate",
      });
    }
  }, []);

  const removeSaved = useCallback((slug: string) => {
    setSaved((prev) => removeBySlug(prev, slug));
  }, []);

  const toggleCompare = useCallback((vehicle: StorefrontVehicleLite) => {
    let result: { ok: boolean; message?: string } = { ok: true };
    let didAdd = false;
    setCompare((prev) => {
      if (prev.some((v) => v.slug === vehicle.slug)) {
        return removeBySlug(prev, vehicle.slug);
      }
      if (prev.length >= COMPARE_MAX) {
        result = {
          ok: false,
          message: `Poți compara maximum ${COMPARE_MAX} mașini.`,
        };
        return prev;
      }
      didAdd = true;
      return upsertBySlug(prev, vehicle, COMPARE_MAX);
    });
    if (didAdd && result.ok) {
      emitMarketingEvent("compare_add", {
        ...vehicleTrackingParams(vehicle),
        source_context: "compare",
      });
    }
    return result;
  }, []);

  const removeCompare = useCallback((slug: string) => {
    setCompare((prev) => removeBySlug(prev, slug));
  }, []);

  const clearCompare = useCallback(() => {
    setCompare([]);
  }, []);

  const value = useMemo(
    () => ({
      tenantSlug,
      ready,
      saved,
      compare,
      isSaved,
      isCompared,
      toggleSaved,
      removeSaved,
      toggleCompare,
      removeCompare,
      clearCompare,
    }),
    [
      tenantSlug,
      ready,
      saved,
      compare,
      isSaved,
      isCompared,
      toggleSaved,
      removeSaved,
      toggleCompare,
      removeCompare,
      clearCompare,
    ],
  );

  return (
    <StorefrontListsContext.Provider value={value}>{children}</StorefrontListsContext.Provider>
  );
}

export function useStorefrontLists(): StorefrontListsContextValue {
  const ctx = useContext(StorefrontListsContext);
  if (!ctx) {
    throw new Error("useStorefrontLists must be used within StorefrontListsProvider");
  }
  return ctx;
}
