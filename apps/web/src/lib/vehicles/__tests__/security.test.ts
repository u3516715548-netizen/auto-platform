import { describe, expect, it } from "vitest";
import {
  InsufficientRoleError,
  VEHICLE_MUTATION_ROLES,
  canMutateVehicle,
} from "@auto-platform/core";
import { createVehicleInputSchema, updateVehicleStatusSchema } from "@auto-platform/types";
import { assertRoleAllowed } from "@/lib/auth/require-role";
import {
  dashboardPath,
  loginPath,
  resolvePostLoginPath,
  resolveUnauthenticatedDashboardPath,
} from "@/lib/auth/auth-redirects";
import {
  vehicleCreatePath,
  vehicleEditPath,
  vehiclesPath,
} from "@/lib/dashboard/nav";
import { formAttemptsTenantId } from "@/lib/vehicles/parse-create-form";
import { rejectTenantIdFromForm } from "@/lib/vehicles/parse-update-form";
import {
  matchesVehicleListView,
  resolveVehicleListView,
} from "@/lib/vehicles/list-vehicles";

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

describe("4E security — roles & tenant_id", () => {
  it("mutation roles include owner/manager/sales and exclude viewer", () => {
    expect(VEHICLE_MUTATION_ROLES).toEqual(["owner", "manager", "sales"]);
    for (const role of VEHICLE_MUTATION_ROLES) {
      expect(canMutateVehicle(role)).toBe(true);
      expect(() =>
        assertRoleAllowed(
          { membershipId: "m", profileId: "p", tenantId: "t", role },
          VEHICLE_MUTATION_ROLES,
        ),
      ).not.toThrow();
    }
    expect(canMutateVehicle("viewer")).toBe(false);
    expect(() =>
      assertRoleAllowed(
        { membershipId: "m", profileId: "p", tenantId: "t", role: "viewer" },
        VEHICLE_MUTATION_ROLES,
      ),
    ).toThrow(InsufficientRoleError);
  });

  it("rejects tenant_id smuggling on create and update forms", () => {
    expect(formAttemptsTenantId(form({ tenant_id: "x" }))).toBe(true);
    expect(formAttemptsTenantId(form({ tenantId: "x" }))).toBe(true);
    expect(rejectTenantIdFromForm(form({ tenant: "x" }))).toBeTruthy();
    expect(
      createVehicleInputSchema.safeParse({
        make: "A",
        model: "B",
        year: 2020,
        mileage: 1,
        price: "1",
        currency: "EUR",
        tenant_id: "00000000-0000-4000-8000-000000000099",
      }).success,
    ).toBe(false);
  });
});

describe("4E security — relative dealer host redirects", () => {
  it("keeps auth and vehicle paths relative (no apex absolute URLs)", () => {
    const paths = [
      loginPath(),
      loginPath({ auth: "required" }),
      resolvePostLoginPath(),
      resolveUnauthenticatedDashboardPath(),
      dashboardPath(),
      vehiclesPath(),
      vehiclesPath({ view: "archived" }),
      vehicleCreatePath(),
      vehicleEditPath("00000000-0000-4000-8000-000000000001"),
      vehicleEditPath("00000000-0000-4000-8000-000000000001", { saved: "1" }),
    ];

    for (const path of paths) {
      expect(path.startsWith("/")).toBe(true);
      expect(path.startsWith("http")).toBe(false);
      expect(path.includes("localhost")).toBe(false);
      expect(path.includes("://")).toBe(false);
    }
  });
});

describe("4E list view — archived exclusion & reactivation eligibility", () => {
  it("Active view excludes archived; archived view includes only archived", () => {
    expect(resolveVehicleListView(undefined)).toBe("active");
    expect(resolveVehicleListView("archived")).toBe("archived");
    expect(resolveVehicleListView("other")).toBe("active");

    expect(matchesVehicleListView("draft", "active")).toBe(true);
    expect(matchesVehicleListView("available", "active")).toBe(true);
    expect(matchesVehicleListView("archived", "active")).toBe(false);
    expect(matchesVehicleListView("archived", "archived")).toBe(true);
    expect(matchesVehicleListView("available", "archived")).toBe(false);
  });

  it("allows reactivation by changing status away from archived", () => {
    expect(updateVehicleStatusSchema.safeParse({ status: "draft" }).success).toBe(true);
    expect(updateVehicleStatusSchema.safeParse({ status: "available" }).success).toBe(true);
    expect(matchesVehicleListView("draft", "active")).toBe(true);
  });
});
