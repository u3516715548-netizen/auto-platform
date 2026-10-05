import { describe, expect, it } from "vitest";
import {
  InsufficientRoleError,
  VEHICLE_MUTATION_ROLES,
  canCreateVehicle,
  canMutateVehicle,
} from "@auto-platform/core";
import { assertRoleAllowed } from "@/lib/auth/require-role";

describe("vehicle mutation roles (4C/4D)", () => {
  it("allows owner, manager, sales to create/edit/status/archive", () => {
    for (const role of VEHICLE_MUTATION_ROLES) {
      expect(canCreateVehicle(role)).toBe(true);
      expect(canMutateVehicle(role)).toBe(true);
      expect(() =>
        assertRoleAllowed(
          { membershipId: "m", profileId: "p", tenantId: "t", role },
          VEHICLE_MUTATION_ROLES,
        ),
      ).not.toThrow();
    }
  });

  it("blocks viewer from all vehicle mutations", () => {
    expect(canCreateVehicle("viewer")).toBe(false);
    expect(canMutateVehicle("viewer")).toBe(false);
    expect(() =>
      assertRoleAllowed(
        {
          membershipId: "m",
          profileId: "p",
          tenantId: "t",
          role: "viewer",
        },
        VEHICLE_MUTATION_ROLES,
      ),
    ).toThrow(InsufficientRoleError);
  });
});
