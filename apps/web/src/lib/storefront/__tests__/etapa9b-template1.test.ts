import { describe, expect, it } from "vitest";
import { publicVehiclePath } from "../paths";
import {
  STOREFRONT_CONTACT_ANCHOR_ID,
  buildStorefrontTelHref,
  buildStorefrontWhatsAppHref,
  storefrontContactHref,
} from "../storefront-contact-links";
import {
  resolveStorefrontHeaderCta,
  resolveStorefrontShellClass,
  storefrontFooterContactLinks,
} from "../storefront-shell-helpers";
import type { PublicTenantView } from "../resolve-public-tenant";

function view(overrides: Partial<PublicTenantView> = {}): PublicTenantView {
  return {
    slug: "acme",
    name: "ACME Motors",
    primaryColor: "#0f766e",
    templateId: "template-1",
    leadsEnabled: true,
    ...overrides,
  };
}

describe("Etapa 9B Template 1 shell helpers", () => {
  it("applies template-1 shell class from DTO templateId", () => {
    expect(resolveStorefrontShellClass("template-1")).toBe("storefront-template-1");
  });

  it("builds tel and WhatsApp hrefs only from normalized E.164 values", () => {
    expect(buildStorefrontTelHref("+40722123456")).toBe("tel:+40722123456");
    expect(buildStorefrontWhatsAppHref("+40722123456")).toBe("https://wa.me/40722123456");
    expect(storefrontContactHref()).toBe("#contact");
    expect(STOREFRONT_CONTACT_ANCHOR_ID).toBe("contact");
  });

  it("footer contact links are conditional and omit when absent", () => {
    expect(storefrontFooterContactLinks(view())).toEqual([]);
    expect(
      storefrontFooterContactLinks(
        view({ phone: "+40722123456", whatsapp: "+40722999888" }),
      ),
    ).toEqual([
      { href: "tel:+40722123456", label: "Telefon" },
      {
        href: "https://wa.me/40722999888",
        label: "WhatsApp",
        external: true,
      },
    ]);
  });

  it("footer remains stable when company projection is empty", () => {
    expect(storefrontFooterContactLinks(view({ company: {} }))).toEqual([]);
  });

  it("header CTA prefers phone, then WhatsApp, else catalog — never invents contact", () => {
    expect(resolveStorefrontHeaderCta(view())).toEqual({
      href: "/",
      label: "Vezi stocul",
    });
    expect(resolveStorefrontHeaderCta(view({ phone: "+40722123456" }))).toEqual({
      href: "tel:+40722123456",
      label: "Sună",
    });
    expect(
      resolveStorefrontHeaderCta(view({ whatsapp: "+40722999888" })),
    ).toEqual({
      href: "https://wa.me/40722999888",
      label: "WhatsApp",
    });
  });

  it("catalog cards use safe public vehicle paths", () => {
    expect(publicVehiclePath("golf-8")).toBe("/vehicles/golf-8");
    expect(publicVehiclePath("golf-8").includes("tenant")).toBe(false);
    expect(publicVehiclePath("golf-8").startsWith("http")).toBe(false);
  });

  it("uses public DTO accent/name fields without raw branding keys", () => {
    const tenant = view({ primaryColor: "#2563eb", name: "ACME Motors" });
    expect(tenant.primaryColor).toBe("#2563eb");
    expect(tenant.name).toBe("ACME Motors");
    expect(tenant).not.toHaveProperty("branding");
    expect(tenant).not.toHaveProperty("tenantId");
  });
});
