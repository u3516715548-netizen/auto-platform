import { describe, expect, it } from "vitest";
import {
  apexWwwRedirectUrl,
  normalizeRootDomain,
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

  it("treats www.{root} as apex on custom domains", () => {
    expect(resolveTenantSlugFromHost("www.autobear.ro", "autobear.ro")).toEqual({
      kind: "apex",
    });
    expect(resolveTenantSlugFromHost("autobear.ro", "autobear.ro")).toEqual({
      kind: "apex",
    });
    expect(resolveTenantSlugFromHost("acme.autobear.ro", "autobear.ro")).toEqual({
      kind: "tenant",
      slug: "acme",
    });
  });

  it("normalizes www. prefix on ROOT_DOMAIN so tenants stay on bare root", () => {
    expect(normalizeRootDomain("www.autobear.ro")).toBe("autobear.ro");
    expect(resolveTenantSlugFromHost("www.autobear.ro", "www.autobear.ro")).toEqual({
      kind: "apex",
    });
    expect(resolveTenantSlugFromHost("acme.autobear.ro", "www.autobear.ro")).toEqual({
      kind: "tenant",
      slug: "acme",
    });
  });
});

describe("apexWwwRedirectUrl", () => {
  it("redirects bare custom apex to https://www.{root}", () => {
    expect(
      apexWwwRedirectUrl({
        hostHeader: "autobear.ro",
        rootDomain: "autobear.ro",
        pathname: "/",
        search: "",
      }),
    ).toBe("https://www.autobear.ro/");
    expect(
      apexWwwRedirectUrl({
        hostHeader: "autobear.ro",
        rootDomain: "autobear.ro",
        pathname: "/preturi",
        search: "?x=1",
      }),
    ).toBe("https://www.autobear.ro/preturi?x=1");
  });

  it("does not redirect www apex, tenants, localhost, or vercel.app", () => {
    expect(
      apexWwwRedirectUrl({
        hostHeader: "www.autobear.ro",
        rootDomain: "autobear.ro",
        pathname: "/",
        search: "",
      }),
    ).toBeNull();
    expect(
      apexWwwRedirectUrl({
        hostHeader: "acme.autobear.ro",
        rootDomain: "autobear.ro",
        pathname: "/",
        search: "",
      }),
    ).toBeNull();
    expect(
      apexWwwRedirectUrl({
        hostHeader: "localhost:3000",
        rootDomain: "localhost:3000",
        pathname: "/",
        search: "",
      }),
    ).toBeNull();
    expect(
      apexWwwRedirectUrl({
        hostHeader: "auto-platform-beige.vercel.app",
        rootDomain: "auto-platform-beige.vercel.app",
        pathname: "/",
        search: "",
      }),
    ).toBeNull();
  });
});
