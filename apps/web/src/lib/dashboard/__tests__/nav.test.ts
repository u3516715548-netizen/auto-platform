import { describe, expect, it } from "vitest";
import {
  DASHBOARD_NAV,
  isDashboardNavActive,
  leadDetailPath,
  leadsPath,
  reservationDetailPath,
  reservationsPath,
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
    expect(leadsPath()).toBe("/dashboard/leads");
    expect(leadDetailPath("00000000-0000-4000-8000-000000000099")).toBe(
      "/dashboard/leads/00000000-0000-4000-8000-000000000099",
    );
    expect(reservationsPath()).toBe("/dashboard/reservations");
    expect(reservationsPath({ filter: "active" })).toBe(
      "/dashboard/reservations?filter=active",
    );
    expect(reservationDetailPath("00000000-0000-4000-8000-000000000088")).toBe(
      "/dashboard/reservations/00000000-0000-4000-8000-000000000088",
    );
  });

  it("marks overview active only on exact /dashboard", () => {
    const overview = DASHBOARD_NAV[0]!;
    expect(isDashboardNavActive("/dashboard", overview)).toBe(true);
    expect(isDashboardNavActive("/dashboard/vehicles", overview)).toBe(false);
  });

  it("marks vehicles active for list and nested edit paths", () => {
    const vehicles = DASHBOARD_NAV.find((i) => i.href === "/dashboard/vehicles")!;
    expect(isDashboardNavActive("/dashboard/vehicles", vehicles)).toBe(true);
    expect(isDashboardNavActive("/dashboard/vehicles/abc", vehicles)).toBe(true);
    expect(isDashboardNavActive("/dashboard", vehicles)).toBe(false);
  });

  it("includes reservations, leads and settings nav items with icons", () => {
    const reservations = DASHBOARD_NAV.find((i) => i.href === "/dashboard/reservations");
    expect(reservations).toBeTruthy();
    expect(reservations!.icon).toBe("reservations");
    expect(isDashboardNavActive("/dashboard/reservations", reservations!)).toBe(true);
    expect(isDashboardNavActive("/dashboard/reservations/abc", reservations!)).toBe(true);

    const leads = DASHBOARD_NAV.find((i) => i.href === "/dashboard/leads");
    expect(leads).toBeTruthy();
    expect(leads!.icon).toBe("leads");
    expect(isDashboardNavActive("/dashboard/leads", leads!)).toBe(true);
    expect(isDashboardNavActive("/dashboard/leads/abc", leads!)).toBe(true);

    const settings = DASHBOARD_NAV.find((i) => i.href === "/dashboard/settings");
    expect(settings).toBeTruthy();
    expect(settings!.icon).toBe("settings");
    expect(settings!.settingsGroup).toBe(true);
    expect(isDashboardNavActive("/dashboard/settings", settings!)).toBe(true);
    expect(isDashboardNavActive("/dashboard/settings/general", settings!)).toBe(true);
    expect(isDashboardNavActive("/dashboard/settings/customization", settings!)).toBe(true);
  });
});

