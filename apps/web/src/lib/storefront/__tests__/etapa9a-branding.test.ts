import { describe, expect, it } from "vitest";
import {
  DEFAULT_STOREFRONT_TEMPLATE_ID,
  TEMPLATE_1_FALLBACK_PRIMARY_COLOR,
  normalizePublicContactNumber,
  publicPhoneSchema,
  publicWhatsappSchema,
  storefrontTemplateIdSchema,
  tenantBrandingUpdateSchema,
} from "@auto-platform/types";
import { parsePublicBranding, parsePublicPrimaryColor } from "../public-dto";
import {
  STOREFRONT_TEMPLATE_REGISTRY,
  getStorefrontTemplate,
  isStorefrontTemplateReady,
  listPreviewableStorefrontTemplates,
  listSelectableStorefrontTemplates,
  resolvePreviewableTemplateId,
  resolveStorefrontTemplateId,
} from "../templates/registry";
import { toPublicTenantView, type PublicTenantRecord } from "../resolve-public-tenant";

describe("Etapa 9A public branding parse", () => {
  it("falls back templateId and primaryColor", () => {
    expect(parsePublicBranding({})).toEqual({
      primaryColor: TEMPLATE_1_FALLBACK_PRIMARY_COLOR,
      templateId: DEFAULT_STOREFRONT_TEMPLATE_ID,
    });
    expect(parsePublicBranding({ templateId: "nope", primaryColor: "red" })).toEqual({
      primaryColor: TEMPLATE_1_FALLBACK_PRIMARY_COLOR,
      templateId: "template-1",
    });
    expect(parsePublicBranding({ templateId: "template-2", primaryColor: "#abc" })).toEqual({
      primaryColor: "#abc",
      templateId: "template-1",
    });
    expect(resolveStorefrontTemplateId(undefined)).toBe("template-1");
    expect(resolveStorefrontTemplateId("evil")).toBe("template-1");
  });

  it("keeps valid primaryColor and omits invalid phone/whatsapp", () => {
    const parsed = parsePublicBranding({
      primaryColor: "#0f766e",
      templateId: "template-1",
      phone: "not-a-phone",
      whatsapp: "https://wa.me/40722123456",
      logoUrl: "https://evil",
      plan: "pro",
    });
    expect(parsed).toEqual({
      primaryColor: "#0f766e",
      templateId: "template-1",
    });
    expect(parsed).not.toHaveProperty("phone");
    expect(parsed).not.toHaveProperty("whatsapp");
    expect(parsed).not.toHaveProperty("logoUrl");
    expect(parsePublicPrimaryColor({ primaryColor: "red" })).toBeNull();
  });

  it("normalizes valid RO / E.164 phone and whatsapp numbers", () => {
    expect(normalizePublicContactNumber("0722 123 456")).toBe("+40722123456");
    expect(normalizePublicContactNumber("+40 722 123 456")).toBe("+40722123456");
    expect(normalizePublicContactNumber("0040722123456")).toBe("+40722123456");
    expect(publicPhoneSchema.safeParse("0722123456").success).toBe(true);
    expect(publicWhatsappSchema.safeParse("+40722123456").success).toBe(true);
    expect(publicPhoneSchema.safeParse("https://wa.me/40722123456").success).toBe(false);
    expect(publicWhatsappSchema.safeParse("wa.me/40722123456").success).toBe(false);
    expect(publicPhoneSchema.safeParse("123").success).toBe(false);

    const withContacts = parsePublicBranding({
      primaryColor: "#2563eb",
      phone: "0722-123-456",
      whatsapp: "+40722999888",
    });
    expect(withContacts.phone).toBe("+40722123456");
    expect(withContacts.whatsapp).toBe("+40722999888");
  });

  it("rejects unknown keys on branding update schema", () => {
    expect(
      tenantBrandingUpdateSchema.safeParse({
        primaryColor: "#2563eb",
        templateId: "template-1",
        phone: null,
        whatsapp: null,
        leadNotificationEmails: [],
      }).success,
    ).toBe(true);
    expect(
      tenantBrandingUpdateSchema.safeParse({
        primaryColor: "#2563eb",
        templateId: "template-1",
        phone: null,
        whatsapp: null,
        logoUrl: "https://x",
      }).success,
    ).toBe(false);
    expect(storefrontTemplateIdSchema.safeParse("template-2").success).toBe(false);
    expect(storefrontTemplateIdSchema.safeParse("template-1").success).toBe(true);
  });

  it("PublicTenantView never exposes raw branding or internal fields", () => {
    const record: PublicTenantRecord = {
      tenantId: "00000000-0000-4000-8000-000000000001",
      slug: "acme",
      name: "ACME",
      status: "active",
      primaryColor: "#0f766e",
      templateId: "template-1",
      phone: "+40722123456",
    };
    const view = toPublicTenantView(record);
    expect(view).toEqual({
      slug: "acme",
      name: "ACME",
      primaryColor: "#0f766e",
      templateId: "template-1",
      phone: "+40722123456",
      leadsEnabled: true,
    });
    expect(view).not.toHaveProperty("branding");
    expect(view).not.toHaveProperty("tenantId");
    expect(view).not.toHaveProperty("status");
    expect(view).not.toHaveProperty("plan");
    expect(Object.keys(view).sort()).toEqual(
      ["leadsEnabled", "name", "phone", "primaryColor", "slug", "templateId"].sort(),
    );
  });
});

describe("Etapa 9A template registry", () => {
  it("only template-1 is ready and selectable; template-2 is coming soon", () => {
    expect(
      STOREFRONT_TEMPLATE_REGISTRY.map((t) => ({ id: t.id, labelRo: t.labelRo, status: t.status })),
    ).toEqual([
      { id: "template-1", labelRo: "Template 1", status: "ready" },
      { id: "template-2", labelRo: "Template 2", status: "coming_soon" },
    ]);
    expect(STOREFRONT_TEMPLATE_REGISTRY.every((t) => t.descriptionRo.length > 0)).toBe(true);
    expect(isStorefrontTemplateReady("template-1")).toBe(true);
    expect(isStorefrontTemplateReady("template-2")).toBe(false);
    expect(listSelectableStorefrontTemplates().map((t) => t.id)).toEqual(["template-1"]);
    expect(getStorefrontTemplate("missing").id).toBe("template-1");
    expect(getStorefrontTemplate("template-1").status).toBe("ready");
    expect(getStorefrontTemplate("template-2").status).toBe("coming_soon");
    expect(listPreviewableStorefrontTemplates().map((t) => t.id)).toEqual([
      "template-1",
      "template-2",
    ]);
    expect(resolvePreviewableTemplateId("template-2")).toBe("template-2");
    expect(resolvePreviewableTemplateId("evil")).toBe("template-1");
  });
});
