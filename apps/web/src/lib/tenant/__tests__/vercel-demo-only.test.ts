import { describe, expect, it } from "vitest";
import {
  isHobbyDemoOnlyEnvironmentActive,
  isHobbyDemoPublicLeadsDisabled,
  isVercelHobbyAppHostname,
  resolveHobbyDemoTenantSlug,
  type HobbyDemoEnvInput,
} from "../vercel-demo-only";

const DEMO_HOST = "proiect.vercel.app";

function baseDemoInput(overrides: Partial<HobbyDemoEnvInput> = {}): HobbyDemoEnvInput {
  return {
    vercel: "1",
    hobbyDemoOnly: "true",
    hobbyDemoTenantSlug: "acme",
    hobbyDemoDisablePublicLeads: undefined,
    vercelUrl: DEMO_HOST,
    vercelProjectProductionUrl: DEMO_HOST,
    host: DEMO_HOST,
    rootDomain: DEMO_HOST,
    ...overrides,
  };
}

describe("HOBBY_DEMO_ONLY gate", () => {
  it("does not activate locally (VERCEL unset / localhost)", () => {
    expect(
      resolveHobbyDemoTenantSlug(
        baseDemoInput({
          vercel: undefined,
          host: "localhost:3000",
          rootDomain: "localhost:3000",
          vercelUrl: undefined,
        }),
      ),
    ).toBeNull();
    expect(
      isHobbyDemoOnlyEnvironmentActive(
        baseDemoInput({
          vercel: undefined,
          host: "acme.localhost:3000",
          rootDomain: "localhost:3000",
        }),
      ),
    ).toBe(false);
  });

  it("does not activate when HOBBY_DEMO_ONLY flag is missing", () => {
    expect(resolveHobbyDemoTenantSlug(baseDemoInput({ hobbyDemoOnly: undefined }))).toBeNull();
    expect(resolveHobbyDemoTenantSlug(baseDemoInput({ hobbyDemoOnly: "1" }))).toBeNull();
    expect(resolveHobbyDemoTenantSlug(baseDemoInput({ hobbyDemoOnly: "TRUE" }))).toBeNull();
  });

  it("does not activate on Host outside allowed Vercel deployment hostnames", () => {
    expect(
      resolveHobbyDemoTenantSlug(
        baseDemoInput({
          host: "evil.vercel.app",
          rootDomain: "evil.vercel.app",
        }),
      ),
    ).toBeNull();
    expect(
      resolveHobbyDemoTenantSlug(
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
      resolveHobbyDemoTenantSlug(
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
      resolveHobbyDemoTenantSlug(
        baseDemoInput({
          host: DEMO_HOST,
          rootDomain: "vercel.app",
        }),
      ),
    ).toBeNull();
  });

  it("activates only when every Hobby demo condition is met", () => {
    expect(resolveHobbyDemoTenantSlug(baseDemoInput())).toBe("acme");
    expect(isHobbyDemoOnlyEnvironmentActive(baseDemoInput())).toBe(true);
  });

  it("accepts production URL alias when it matches Host", () => {
    expect(
      resolveHobbyDemoTenantSlug(
        baseDemoInput({
          vercelUrl: "other-preview.vercel.app",
          vercelProjectProductionUrl: DEMO_HOST,
        }),
      ),
    ).toBe("acme");
  });

  it("fail-closed on missing / invalid demo slug (never another tenant)", () => {
    expect(resolveHobbyDemoTenantSlug(baseDemoInput({ hobbyDemoTenantSlug: undefined }))).toBeNull();
    expect(resolveHobbyDemoTenantSlug(baseDemoInput({ hobbyDemoTenantSlug: "" }))).toBeNull();
    expect(resolveHobbyDemoTenantSlug(baseDemoInput({ hobbyDemoTenantSlug: "Acme!" }))).toBeNull();
    expect(resolveHobbyDemoTenantSlug(baseDemoInput({ hobbyDemoTenantSlug: "a" }))).toBeNull();
    expect(
      resolveHobbyDemoTenantSlug(baseDemoInput({ hobbyDemoTenantSlug: "not a slug" })),
    ).toBeNull();
  });

  it("never takes tenant from query/path/client-shaped fields (API has no such inputs)", () => {
    const withOnlyServerFields = baseDemoInput({ hobbyDemoTenantSlug: "acme" });
    expect(resolveHobbyDemoTenantSlug(withOnlyServerFields)).toBe("acme");
    expect(
      resolveHobbyDemoTenantSlug(
        baseDemoInput({
          host: "beta.vercel.app",
          rootDomain: "beta.vercel.app",
          hobbyDemoTenantSlug: "acme",
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

describe("HOBBY_DEMO_DISABLE_PUBLIC_LEADS", () => {
  it("is off when flag missing even if demo gate is open", () => {
    expect(isHobbyDemoPublicLeadsDisabled(baseDemoInput())).toBe(false);
    expect(
      isHobbyDemoPublicLeadsDisabled(baseDemoInput({ hobbyDemoDisablePublicLeads: "1" })),
    ).toBe(false);
  });

  it("blocks only when demo environment is active and flag is exactly true", () => {
    expect(
      isHobbyDemoPublicLeadsDisabled(
        baseDemoInput({ hobbyDemoDisablePublicLeads: "true" }),
      ),
    ).toBe(true);
    expect(
      isHobbyDemoPublicLeadsDisabled(
        baseDemoInput({
          hobbyDemoDisablePublicLeads: "true",
          vercel: undefined,
        }),
      ),
    ).toBe(false);
    expect(
      isHobbyDemoPublicLeadsDisabled(
        baseDemoInput({
          hobbyDemoDisablePublicLeads: "true",
          host: "localhost:3000",
          rootDomain: "localhost:3000",
          vercelUrl: undefined,
        }),
      ),
    ).toBe(false);
  });
});
