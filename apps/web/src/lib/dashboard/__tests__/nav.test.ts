import { describe, expect, it } from "vitest";
import {
  DASHBOARD_NAV,
  isDashboardNavActive,
  vehicleCreatePath,
  vehicleEditPath,
  vehiclesPath,
} from "../nav";

describe("dashboard nav paths", () => {
  it("uses relative dashboard paths only (no absolute apex URLs)", () => {
    for (const item of DASHBOARD_NAV) {
      expect(item.href.startsWith("/")).toBe(true);
      expect(item.href.startsWith("http")).toBe(false);
      expect(item.href.includes("localhost")).toBe(false);
    }
    expect(vehiclesPath()).toBe("/dashboard/vehicles");
    expect(vehiclesPath({ view: "archived" })).toBe("/dashboard/vehicles?view=archived");
    expect(vehicleCreatePath()).toBe("/dashboard/vehicles/new");
    expect(vehicleCreatePath().startsWith("http")).toBe(false);
    expect(vehicleEditPath("00000000-0000-4000-8000-000000000001")).toBe(
      "/dashboard/vehicles/00000000-0000-4000-8000-000000000001",
    );
    expect(vehicleEditPath("00000000-0000-4000-8000-000000000001", { saved: "1" })).toContain(
      "saved=1",
    );
  });

  it("marks overview active only on exact /dashboard", () => {
    const overview = DASHBOARD_NAV[0]!;
    expect(isDashboardNavActive("/dashboard", overview)).toBe(true);
    expect(isDashboardNavActive("/dashboard/vehicles", overview)).toBe(false);
  });

  it("marks vehicles active for list and nested edit paths", () => {
    const vehicles = DASHBOARD_NAV[1]!;
    expect(isDashboardNavActive("/dashboard/vehicles", vehicles)).toBe(true);
    expect(isDashboardNavActive("/dashboard/vehicles/abc", vehicles)).toBe(true);
    expect(isDashboardNavActive("/dashboard", vehicles)).toBe(false);
  });
});
