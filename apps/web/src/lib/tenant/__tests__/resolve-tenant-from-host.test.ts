import { describe, expect, it } from "vitest";
import {
  requireTenantSlugFromHost,
  resolveTenantSlugFromHost,
} from "../resolve-tenant-from-host";
import { TenantResolutionError } from "@auto-platform/core";

const ROOT = "localhost:3000";

describe("resolveTenantSlugFromHost", () => {
  it("resolves acme.localhost:3000", () => {
    expect(resolveTenantSlugFromHost("acme.localhost:3000", ROOT)).toEqual({
      kind: "tenant",
      slug: "acme",
    });
  });

  it("resolves beta.localhost:3000", () => {
    expect(resolveTenantSlugFromHost("beta.localhost:3000", ROOT)).toEqual({
      kind: "tenant",
      slug: "beta",
    });
  });

  it("treats apex localhost:3000 as no tenant", () => {
    expect(resolveTenantSlugFromHost("localhost:3000", ROOT)).toEqual({ kind: "apex" });
  });

  it("rejects host outside root domain", () => {
    expect(resolveTenantSlugFromHost("evil.com", ROOT)).toEqual({
      kind: "invalid",
      reason: "host_outside_root_domain",
    });
  });

  it("rejects invalid tenant slug characters", () => {
    expect(resolveTenantSlugFromHost("Acme!.localhost:3000", ROOT).kind).toBe("invalid");
  });

  it("requireTenantSlugFromHost throws on apex", () => {
    expect(() => requireTenantSlugFromHost("localhost:3000", ROOT)).toThrow(
      TenantResolutionError,
    );
  });

  it("requireTenantSlugFromHost throws on invalid host", () => {
    expect(() => requireTenantSlugFromHost("not-a-tenant.example", ROOT)).toThrow(
      TenantResolutionError,
    );
  });
});
