import { describe, expect, it } from "vitest";
import {
  InsufficientRoleError,
  MembershipRequiredError,
  TenantAccessError,
  TenantResolutionError,
  assertTenantAccess,
  hasMinimumRole,
} from "@auto-platform/core";
import { assertRoleAllowed } from "../require-role";
import { loadTenantBySlug } from "@/lib/tenant/get-current-tenant";
import { loadMembership } from "../require-membership";

describe("assertTenantAccess", () => {
  it("allows matching tenant ids", () => {
    expect(() => assertTenantAccess("tenant-a", "tenant-a")).not.toThrow();
  });

  it("denies cross-tenant mismatch", () => {
    expect(() => assertTenantAccess("tenant-a", "tenant-b")).toThrow(TenantAccessError);
  });
});

describe("requireRole helpers", () => {
  it("allows listed role", () => {
    expect(() =>
      assertRoleAllowed(
        {
          membershipId: "m1",
          profileId: "p1",
          tenantId: "t1",
          role: "manager",
        },
        ["owner", "manager"],
      ),
    ).not.toThrow();
  });

  it("denies insufficient role", () => {
    expect(() =>
      assertRoleAllowed(
        {
          membershipId: "m1",
          profileId: "p1",
          tenantId: "t1",
          role: "viewer",
        },
        ["owner", "manager"],
      ),
    ).toThrow(InsufficientRoleError);
  });

  it("role hierarchy: sales is below manager", () => {
    expect(hasMinimumRole("sales", "manager")).toBe(false);
    expect(hasMinimumRole("owner", "manager")).toBe(true);
  });
});

describe("membership / tenant DB guards (online when DATABASE_URL present)", () => {
  const hasDb = Boolean(process.env.DATABASE_URL);

  it.skipIf(!hasDb)("throws for nonexistent tenant slug", async () => {
    await expect(loadTenantBySlug("no-such-tenant-zzzz")).rejects.toThrow(TenantResolutionError);
  });

  it.skipIf(!hasDb)("returns null membership for unknown profile/tenant pair", async () => {
    const membership = await loadMembership(
      "00000000-0000-4000-8000-000000000099",
      "00000000-0000-4000-8000-000000000098",
    );
    expect(membership).toBeNull();
  });

  it("documents MembershipRequiredError for callers", () => {
    const err = new MembershipRequiredError();
    expect(err.code).toBe("MEMBERSHIP_REQUIRED");
  });
});
