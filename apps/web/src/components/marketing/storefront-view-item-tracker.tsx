"use client";

import { useEffect } from "react";
import { emitMarketingEvent } from "@/lib/marketing/emit-marketing-event";
import { parsePriceEurNumber } from "@/lib/storefront/storefront-vehicle-lite";

type Props = {
  vehicle: {
    slug: string;
    make: string;
    model: string;
    year: number;
    price: string;
    currency: "EUR";
    fuel: string | null;
    transmission: string | null;
    bodyType: string | null;
  };
};

/** Once-per-slug view_item on PDP mount. */
export function StorefrontViewItemTracker({ vehicle }: Props) {
  useEffect(() => {
    const price = parsePriceEurNumber(vehicle.price);
    emitMarketingEvent(
      "view_item",
      {
        page_type: "vehicle_detail",
        vehicle_slug: vehicle.slug,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        ...(vehicle.bodyType ? { body_type: vehicle.bodyType } : {}),
        ...(vehicle.fuel ? { fuel_type: vehicle.fuel } : {}),
        ...(vehicle.transmission ? { transmission: vehicle.transmission } : {}),
        ...(price > 0 ? { price, currency: "EUR" as const } : {}),
      },
      { dedupeKey: `view_item:${vehicle.slug}` },
    );
  }, [vehicle]);

  return null;
}
