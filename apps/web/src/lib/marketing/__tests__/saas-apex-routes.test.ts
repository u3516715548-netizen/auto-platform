import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const webRoot = resolve(__dirname, "../../..");

function readSrc(rel: string): string {
  return readFileSync(resolve(webRoot, rel), "utf8");
}

describe("apex commercial routes (Etapa 26A)", () => {
  it("serves SaasLanding on apex home and PricingGrid on /preturi", () => {
    const home = readSrc("app/page.tsx");
    const preturi = readSrc("app/preturi/page.tsx");
    expect(home).toContain("SaasLanding");
    expect(home).not.toContain("function ApexLanding");
    expect(preturi).toContain("PricingGrid");
    expect(preturi).toContain('resolved.kind !== "apex"');
    expect(preturi).toContain("notFound()");
  });

  it("documents Hobby apex catalog opt-in without defaulting catalog on apex", () => {
    const demo = readSrc("lib/tenant/vercel-demo-only.ts");
    expect(demo).toContain("HOBBY_DEMO_APEX_CATALOG");
    expect(demo).toContain("isHobbyDemoApexCatalogEnabled");
    expect(demo).toContain("hobbyDemoApexCatalog");
  });
});
