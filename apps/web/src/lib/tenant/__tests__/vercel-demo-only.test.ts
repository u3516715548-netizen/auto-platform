import { describe, expect, it } from "vitest";
import {
  isVercelDemoOnlyEnvironmentActive,
  isVercelDemoPublicLeadsDisabled,
  isVercelHobbyAppHostname,
  resolveVercelDemoTenantSlug,
  type VercelDemoOnlyEnvInput,
} from "../vercel-demo-only";

const DEMO_HOST = "proiect.vercel.app";

function baseDemoInput(overrides: Partial<VercelDemoOnlyEnvInput> = {}): VercelDemoOnlyEnvInput {
  return {
    vercel: "1",
    vercelDemoOnly: "true",
    vercelDemoTenantSlug: "acme",
    vercelDemoDisablePublicLeads: undefined,
    vercelUrl: DEMO_HOST,
    vercelProjectProductionUrl: DEMO_HOST,
    host: DEMO_HOST,
    rootDomain: DEMO_HOST,
    ...overrides,
  };
}

describe("VERCEL_DEMO_ONLY gate", () => {
  it("does not activate locally (VERCEL unset / localhost)", () => {
    expect(
      resolveVercelDemoTenantSlug(
        baseDemoInput({
          vercel: undefined,
          host: "localhost:3000",
          rootDomain: "localhost:3000",
          vercelUrl: undefined,
        }),
      ),
    ).toBeNull();
    expect(
      isVercelDemoOnlyEnvironmentActive(
        baseDemoInput({
          vercel: undefined,
          host: "acme.localhost:3000",
          rootDomain: "localhost:3000",
        }),
      ),
    ).toBe(false);
  });

  it("does not activate when VERCEL_DEMO_ONLY flag is missing", () => {
    expect(resolveVercelDemoTenantSlug(baseDemoInput({ vercelDemoOnly: undefined }))).toBeNull();
    expect(resolveVercelDemoTenantSlug(baseDemoInput({ vercelDemoOnly: "1" }))).toBeNull();
    expect(resolveVercelDemoTenantSlug(baseDemoInput({ vercelDemoOnly: "TRUE" }))).toBeNull();
  });

  it("does not activate on Host outside allowed Vercel deployment hostnames", () => {
    expect(
      resolveVercelDemoTenantSlug(
        baseDemoInput({
          host: "evil.vercel.app",
          rootDomain: "evil.vercel.app",
        }),
      ),
    ).toBeNull();
    expect(
      resolveVercelDemoTenantSlug(
        baseDemoInput({
          host: "attacker.example",
          rootDomain: "attacker.example",
          vercelUrl: "attacker.example",
        }),
      ),
    ).toBeNull();
  });

  it("does not activate on custom / real production domains", () => {
    expect(
      resolveVercelDemoTenantSlug(
        baseDemoInput({
          host: "domeniu.ro",
          rootDomain: "domeniu.ro",
          vercelUrl: "domeniu.ro",
          vercelProjectProductionUrl: "domeniu.ro",
        }),
      ),
    ).toBeNull();
    expect(isVercelHobbyAppHostname("domeniu.ro")).toBe(false);
    expect(isVercelHobbyAppHostname("acme.domeniu.ro")).toBe(false);
  });

  it("does not activate when ROOT_DOMAIN is a wildcard parent (host ≠ root)", () => {
    expect(
      resolveVercelDemoTenantSlug(
        baseDemoInput({
          host: DEMO_HOST,
          rootDomain: "vercel.app",
        }),
      ),
    ).toBeNull();
  });

  it("activates only when every Hobby demo condition is met", () => {
    expect(resolveVercelDemoTenantSlug(baseDemoInput())).toBe("acme");
    expect(isVercelDemoOnlyEnvironmentActive(baseDemoInput())).toBe(true);
  });

  it("accepts production URL alias when it matches Host", () => {
    expect(
      resolveVercelDemoTenantSlug(
        baseDemoInput({
          vercelUrl: "other-preview.vercel.app",
          vercelProjectProductionUrl: DEMO_HOST,
        }),
      ),
    ).toBe("acme");
  });

  it("fail-closed on missing / invalid demo slug (never another tenant)", () => {
    expect(resolveVercelDemoTenantSlug(baseDemoInput({ vercelDemoTenantSlug: undefined }))).toBeNull();
    expect(resolveVercelDemoTenantSlug(baseDemoInput({ vercelDemoTenantSlug: "" }))).toBeNull();
    expect(resolveVercelDemoTenantSlug(baseDemoInput({ vercelDemoTenantSlug: "Acme!" }))).toBeNull();
    expect(resolveVercelDemoTenantSlug(baseDemoInput({ vercelDemoTenantSlug: "a" }))).toBeNull();
    expect(
      resolveVercelDemoTenantSlug(baseDemoInput({ vercelDemoTenantSlug: "not a slug" })),
    ).toBeNull();
  });

  it("never takes tenant from query/path/client-shaped fields (API has no such inputs)", () => {
    const withOnlyServerFields = baseDemoInput({ vercelDemoTenantSlug: "acme" });
    expect(resolveVercelDemoTenantSlug(withOnlyServerFields)).toBe("acme");
    // Spoofed host that is not the deployment URL must not unlock the configured slug.
    expect(
      resolveVercelDemoTenantSlug(
        baseDemoInput({
          host: "beta.vercel.app",
          rootDomain: "beta.vercel.app",
          vercelDemoTenantSlug: "acme",
        }),
      ),
    ).toBeNull();
  });
});

describe("Host-based tenancy remains independent", () => {
  it("Hobby hostname helper accepts single-label *.vercel.app only", () => {
    expect(isVercelHobbyAppHostname("proiect.vercel.app")).toBe(true);
    expect(isVercelHobbyAppHostname("proiect-git-main-team.vercel.app")).toBe(true);
    expect(isVercelHobbyAppHostname("foo.bar.vercel.app")).toBe(false);
    expect(isVercelHobbyAppHostname("localhost:3000")).toBe(false);
  });
});

describe("VERCEL_DEMO_DISABLE_PUBLIC_LEADS", () => {
  it("is off when flag missing even if demo gate is open", () => {
    expect(isVercelDemoPublicLeadsDisabled(baseDemoInput())).toBe(false);
    expect(
      isVercelDemoPublicLeadsDisabled(baseDemoInput({ vercelDemoDisablePublicLeads: "1" })),
    ).toBe(false);
  });

  it("blocks only when demo environment is active and flag is exactly true", () => {
    expect(
      isVercelDemoPublicLeadsDisabled(
        baseDemoInput({ vercelDemoDisablePublicLeads: "true" }),
      ),
    ).toBe(true);
    expect(
      isVercelDemoPublicLeadsDisabled(
        baseDemoInput({
          vercelDemoDisablePublicLeads: "true",
          vercel: undefined,
        }),
      ),
    ).toBe(false);
    expect(
      isVercelDemoPublicLeadsDisabled(
        baseDemoInput({
          vercelDemoDisablePublicLeads: "true",
          host: "localhost:3000",
          rootDomain: "localhost:3000",
          vercelUrl: undefined,
        }),
      ),
    ).toBe(false);
  });
});
