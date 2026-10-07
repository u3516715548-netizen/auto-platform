import { describe, expect, it } from "vitest";
import {
  DEMO_DEALER,
  DEMO_VEHICLES,
  demoVehicleToCatalogDto,
  filterDemoVehicles,
  findDemoVehicle,
  listDemoCatalogDtos,
} from "../demo-storefront-data";

describe("demo storefront data", () => {
  it("exposes Demo Motors dealer without real tenant fields", () => {
    expect(DEMO_DEALER.name).toBe("Demo Motors");
    expect(DEMO_DEALER.email).toContain("demo-motors.test");
    expect(DEMO_DEALER.slug).toBe("demo-motors");
    expect(DEMO_DEALER.slug).not.toContain("acme");
    expect(DEMO_VEHICLES).toHaveLength(3);
    expect(DEMO_VEHICLES.map((v) => `${v.make} ${v.model}`)).toEqual([
      "Maserati GranTurismo",
      "Audi RS 6",
      "Koenigsegg CCX",
    ]);
  });

  it("filters and finds vehicles locally", () => {
    expect(filterDemoVehicles("audi").every((v) => v.make === "Audi")).toBe(true);
    expect(findDemoVehicle("audi-rs6")?.make).toBe("Audi");
    expect(findDemoVehicle("maserati-granturismo")?.priceEur).toBe(90_000);
    expect(findDemoVehicle("missing")).toBeUndefined();
  });

  it("uses only local cover images under /demo-vehicles", () => {
    for (const vehicle of DEMO_VEHICLES) {
      expect(vehicle.coverSrc.startsWith("/demo-vehicles/")).toBe(true);
      expect(vehicle.coverSrc.includes("http")).toBe(false);
      expect(vehicle.coverSrc.toLowerCase()).not.toContain("supabase");
    }
  });

  it("maps to catalog DTOs without forbidden tenant keys", () => {
    const dto = demoVehicleToCatalogDto(DEMO_VEHICLES[0]!);
    expect(dto).not.toHaveProperty("id");
    expect(dto).not.toHaveProperty("tenantId");
    expect(dto).not.toHaveProperty("vin");
    expect(dto.coverImage?.url?.startsWith("/demo-vehicles/")).toBe(true);
    expect(listDemoCatalogDtos()).toHaveLength(3);
  });
});
