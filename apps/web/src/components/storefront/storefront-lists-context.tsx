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
    setSaved((prev) =>
      prev.some((v) => v.slug === vehicle.slug)
        ? removeBySlug(prev, vehicle.slug)
        : upsertBySlug(prev, vehicle),
    );
  }, []);

  const removeSaved = useCallback((slug: string) => {
    setSaved((prev) => removeBySlug(prev, slug));
  }, []);

  const toggleCompare = useCallback((vehicle: StorefrontVehicleLite) => {
    let result: { ok: boolean; message?: string } = { ok: true };
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
      return upsertBySlug(prev, vehicle, COMPARE_MAX);
    });
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
