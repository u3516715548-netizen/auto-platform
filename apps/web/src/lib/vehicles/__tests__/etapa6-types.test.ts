import { describe, expect, it } from "vitest";
import {
  formatMileageKmRo,
  formatPriceEurRo,
  vehicleFeaturesSchema,
  vehiclePublishRequiredSchema,
  vehicleAccidentStatusSchema,
  vehicleCurrencySchema,
} from "@auto-platform/types";

describe("Etapa 6A — format helpers ro-RO", () => {
  it("formats EUR prices as 12.900 €", () => {
    expect(formatPriceEurRo("12900")).toBe("12.900 €");
    expect(formatPriceEurRo(12900)).toBe("12.900 €");
    expect(formatPriceEurRo("18990.00")).toBe("18.990 €");
  });

  it("formats mileage as 145.000 km", () => {
    expect(formatMileageKmRo(145000)).toBe("145.000 km");
    expect(formatMileageKmRo(25000)).toBe("25.000 km");
  });
});

describe("Etapa 6A — Zod enums and publish gate", () => {
  it("locks vehicle currency to EUR", () => {
    expect(vehicleCurrencySchema.safeParse("EUR").success).toBe(true);
    expect(vehicleCurrencySchema.safeParse("RON").success).toBe(false);
  });

  it("accepts accident status including cosmetic", () => {
    expect(vehicleAccidentStatusSchema.safeParse("cosmetic").success).toBe(true);
    expect(vehicleAccidentStatusSchema.safeParse("totaled").success).toBe(false);
  });

  it("rejects unknown feature keys", () => {
    expect(vehicleFeaturesSchema.safeParse(["abs", "esp"]).success).toBe(true);
    expect(vehicleFeaturesSchema.safeParse(["abs", "nitro"]).success).toBe(false);
  });

  it("publish required schema needs fuel/transmission/body/condition/power/description/vat", () => {
    const incomplete = vehiclePublishRequiredSchema.safeParse({
      make: "VW",
      model: "Golf",
      year: 2022,
      mileage: 1000,
      price: "10000",
    });
    expect(incomplete.success).toBe(false);

    const complete = vehiclePublishRequiredSchema.safeParse({
      make: "VW",
      model: "Golf",
      year: 2022,
      mileage: 1000,
      price: "10000",
      fuel: "diesel",
      transmission: "manual",
      bodyType: "hatchback",
      condition: "used",
      powerHp: 150,
      description:
        "Descriere validă pentru publicare, fără HTML, suficient de lungă pentru SEO.",
      vatRegime: "deductible",
    });
    expect(complete.success).toBe(true);
  });

  it("rejects HTML in publish description", () => {
    const parsed = vehiclePublishRequiredSchema.safeParse({
      make: "VW",
      model: "Golf",
      year: 2022,
      mileage: 1000,
      price: "10000",
      fuel: "diesel",
      transmission: "manual",
      bodyType: "hatchback",
      condition: "used",
      powerHp: 150,
      description: "<script>alert(1)</script> text suficient de lung pentru validare.",
      vatRegime: "included",
    });
    expect(parsed.success).toBe(false);
  });
});
