import { describe, expect, it } from "vitest";
import { storefrontTemplateIdSchema } from "@auto-platform/types";
import {
  DEMO_DEALER,
  DEMO_VEHICLES,
  listDemoVehicleAlternatives,
} from "@/lib/storefront/demo/demo-storefront-data";
import {
  isStorefrontTemplateReady,
  listPreviewableStorefrontTemplates,
  listSelectableStorefrontTemplates,
  resolvePreviewableTemplateId,
  resolveStorefrontLayoutId,
  resolveStorefrontTemplateId,
  STOREFRONT_TEMPLATE_REGISTRY,
  themePreviewPath,
} from "@/lib/storefront/templates/registry";

describe("theme preview isolation from live storefront", () => {
  it("keeps Template 1 and Template 2 ready / selectable", () => {
    expect(STOREFRONT_TEMPLATE_REGISTRY.map((t) => t.id)).toEqual([
      "template-1",
      "template-2",
    ]);
    expect(STOREFRONT_TEMPLATE_REGISTRY[0]?.labelRo).toBe("Template 1");
    expect(isStorefrontTemplateReady("template-1")).toBe(true);
    expect(isStorefrontTemplateReady("template-2")).toBe(true);
    expect(listSelectableStorefrontTemplates().map((t) => t.id)).toEqual([
      "template-1",
      "template-2",
    ]);
    expect(storefrontTemplateIdSchema.safeParse("template-2").success).toBe(true);
    expect(storefrontTemplateIdSchema.safeParse("template-1").success).toBe(true);
    expect(
      STOREFRONT_TEMPLATE_REGISTRY.find((t) => t.id === "template-2")?.descriptionRo,
    ).toContain("Activarea folosește datele reale ale dealerului");
  });

  it("resolves branding templateId for live T1 and T2; invalid falls back to T1", () => {
    expect(resolveStorefrontTemplateId("template-2")).toBe("template-2");
    expect(resolveStorefrontTemplateId("evil")).toBe("template-1");
    expect(resolveStorefrontTemplateId("template-1")).toBe("template-1");
  });

  it("keeps preview of template-2 isolated (DEMO path, no auto-apply)", () => {
    expect(resolvePreviewableTemplateId("template-2")).toBe("template-2");
    expect(resolveStorefrontLayoutId("template-2")).toBe("template-2");
    expect(listPreviewableStorefrontTemplates().map((t) => t.id)).toContain("template-2");
    expect(listSelectableStorefrontTemplates().map((t) => t.id)).toContain("template-2");
    // Preview URL is GET-only — apply requires explicit server action + confirm.
    expect(themePreviewPath("template-2")).toContain("templateId=template-2");
    expect(themePreviewPath("template-2")).not.toContain("apply");
  });

  it("builds preview URLs that do not mutate branding by themselves", () => {
    expect(themePreviewPath("template-1")).toBe(
      "/dashboard/settings/customization/themes/preview?templateId=template-1",
    );
    expect(themePreviewPath("template-2")).toContain("templateId=template-2");
    expect(themePreviewPath("template-1")).not.toContain("apply");
  });

  it("demo dealer and vehicles stay isolated from ACME / public catalog paths", () => {
    expect(DEMO_DEALER.name).toBe("Demo Motors");
    expect(DEMO_DEALER.name.toLowerCase()).not.toContain("acme");
    expect(DEMO_DEALER.email).toContain(".test");
    for (const v of DEMO_VEHICLES) {
      expect(v.coverSrc.startsWith("/demo-vehicles/")).toBe(true);
      expect(v.coverSrc.startsWith("/vehicles")).toBe(false);
    }
  });

  it("demo alternatives use only local demo catalog (no tenant query)", () => {
    const slug = DEMO_VEHICLES[0]!.slug;
    const alts = listDemoVehicleAlternatives(slug);
    expect(alts.length).toBeGreaterThan(0);
    expect(alts.every((v) => v.slug !== slug)).toBe(true);
    expect(alts.every((v) => v.coverImage?.url?.startsWith("/demo-vehicles/"))).toBe(
      true,
    );
  });
});
