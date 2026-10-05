import { describe, expect, it } from "vitest";
import { formatMileageKmRo, formatPriceEurRo } from "@auto-platform/types";
import {
  buildPublicVehicleDetailDescription,
  buildPublicVehicleDetailTitle,
  filterPublicFeatures,
  PUBLIC_VEHICLE_DTO_KEYS,
  toPublicVehicleDto,
} from "../public-dto";
import { formatPublicVehicleCatalogSummary } from "../public-vehicle-display";

const COMPLETE_ROW = {
  slug: "golf-8-acme",
  make: "Volkswagen",
  model: "Golf",
  year: 2022,
  mileage: 25000,
  price: "18990.00",
  currency: "RON",
  fuel: "diesel",
  transmission: "manual",
  bodyType: "hatchback",
  condition: "used",
  powerHp: 150,
  description: "Descriere validă pentru test, fără HTML.",
  driveType: "fwd",
  engineDisplacementCc: 1968,
  emissionStandard: "euro_6d",
  doors: 5,
  seats: 5,
  exteriorColor: "Gri",
  interiorColor: "Negru",
  firstRegistrationYear: 2022,
  firstRegistrationMonth: 3,
  priceNegotiable: true,
  vatRegime: "deductible",
  originCountry: "de",
  locationCity: "București",
  warrantyMonths: 12,
  warrantyNotes: "Note garanție",
  hasServiceBook: true,
  hasServiceHistory: true,
  accidentStatus: "none",
  features: ["abs", "carplay", "unknown_feature", "carplay"],
};

describe("Etapa 6C public vehicle DTO", () => {
  it("whitelist keys only; never id/vin/tenantId/status/specs", () => {
    const dto = toPublicVehicleDto(COMPLETE_ROW);
    expect(Object.keys(dto).sort()).toEqual([...PUBLIC_VEHICLE_DTO_KEYS].sort());
    expect(dto).not.toHaveProperty("id");
    expect(dto).not.toHaveProperty("vin");
    expect(dto).not.toHaveProperty("tenantId");
    expect(dto).not.toHaveProperty("status");
    expect(dto).not.toHaveProperty("specs");
    expect(dto).not.toHaveProperty("createdAt");
  });

  it("forces currency EUR regardless of row currency", () => {
    const dto = toPublicVehicleDto(COMPLETE_ROW);
    expect(dto.currency).toBe("EUR");
  });

  it("filters features to allowlist with Romanian labels", () => {
    expect(filterPublicFeatures(["abs", "evil", "carplay"])).toEqual([
      { key: "abs", label: "ABS" },
      { key: "carplay", label: "Apple CarPlay" },
    ]);
    const dto = toPublicVehicleDto(COMPLETE_ROW);
    expect(dto.features).toHaveLength(2);
    expect(dto.features[0]?.label).toBe("ABS");
  });

  it("strips HTML from description and warranty notes", () => {
    const dto = toPublicVehicleDto({
      ...COMPLETE_ROW,
      description: "<script>x</script>Descriere sigură pentru test public.",
      warrantyNotes: "<b>OK</b> note",
    });
    expect(dto.description).toBe("Descriere sigură pentru test public.");
    expect(dto.warrantyNotes).toBe("OK note");
    expect(dto.description).not.toMatch(/<[^>]+>/);
  });

  it("formats SEO title and description in Romanian", () => {
    const dto = toPublicVehicleDto(COMPLETE_ROW);
    expect(buildPublicVehicleDetailTitle(dto, "ACME Motors")).toBe(
      "Volkswagen Golf 2022 – 18.990 € | ACME Motors",
    );
    const desc = buildPublicVehicleDetailDescription(dto);
    expect(desc).toContain(formatMileageKmRo(25000));
    expect(desc).toContain("Descriere validă");
  });

  it("catalog summary uses ro-RO EUR and km helpers", () => {
    const dto = toPublicVehicleDto(COMPLETE_ROW);
    expect(formatPriceEurRo(dto.price)).toBe("18.990 €");
    expect(formatMileageKmRo(dto.mileage)).toBe("25.000 km");
    const summary = formatPublicVehicleCatalogSummary(dto);
    expect(summary).toContain("Diesel");
    expect(summary).toContain("150 CP");
  });
});
