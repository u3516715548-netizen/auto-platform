import { describe, expect, it } from "vitest";
import {
  normalizeBrandAssetPath,
  normalizeRomanianCui,
  normalizeRomanianRegistrationNumber,
  upsertCompanyProfileInputSchema,
  type PublicCompanyView,
} from "@auto-platform/types";
import { mapPublicCompanyRow } from "@/lib/storefront/load-public-company";
import {
  storefrontFooterAddressLine,
  storefrontFooterContactLinks,
  storefrontFooterLegalLine,
} from "@/lib/storefront/storefront-shell-helpers";
import type { PublicTenantView } from "@/lib/storefront/resolve-public-tenant";

describe("Etapa 22 company profile validations", () => {
  it("accepts valid CUI checksum and rejects invalid", () => {
    expect(normalizeRomanianCui("RO1593112")).toBe("1593112");
    expect(normalizeRomanianCui("123")).toBeNull();
  });

  it("normalizes Reg. Com. structurally", () => {
    expect(normalizeRomanianRegistrationNumber("j40/1234/2020")).toBe(
      "J40/1234/2020",
    );
    expect(normalizeRomanianRegistrationNumber("invalid")).toBeNull();
  });

  it("validates brand asset paths without secrets", () => {
    expect(normalizeBrandAssetPath("tenants/acme/logo.webp")).toBe(
      "tenants/acme/logo.webp",
    );
    expect(normalizeBrandAssetPath("../secret")).toBeNull();
    expect(
      normalizeBrandAssetPath("https://cdn.example/logo.png?token=abc"),
    ).toBeNull();
  });

  it("parses upsert input with trim, email, phone, website, currency", () => {
    const ok = upsertCompanyProfileInputSchema.safeParse({
      tradingName: "  ACME Motors  ",
      legalName: "ACME Motors SRL",
      taxId: "RO1593112",
      registrationNumber: "J40/1234/2020",
      entityType: "srl",
      publicEmail: "  Contact@ACME.TEST ",
      publicPhone: "0722123456",
      website: "acme.test",
      city: "București",
      county: "București",
      country: "ro",
      postalCode: "010101",
      currency: "EUR",
      businessHours: {
        mon: { open: "09:00", close: "18:00" },
        note: "Închis sărbători",
      },
    });
    expect(ok.success).toBe(true);
    if (!ok.success) return;
    expect(ok.data.tradingName).toBe("ACME Motors");
    expect(ok.data.taxId).toBe("1593112");
    expect(ok.data.publicEmail).toBe("contact@acme.test");
    expect(ok.data.publicPhone).toBe("+40722123456");
    expect(ok.data.website).toMatch(/^https:\/\/acme\.test/);
    expect(ok.data.country).toBe("RO");
  });

  it("rejects invalid CUI, phone, website, currency, postal coherence", () => {
    expect(
      upsertCompanyProfileInputSchema.safeParse({
        tradingName: "ACME",
        taxId: "123",
      }).success,
    ).toBe(false);

    expect(
      upsertCompanyProfileInputSchema.safeParse({
        tradingName: "ACME",
        publicPhone: "not-a-phone",
      }).success,
    ).toBe(false);

    expect(
      upsertCompanyProfileInputSchema.safeParse({
        tradingName: "ACME",
        website: "javascript:alert(1)",
      }).success,
    ).toBe(false);

    expect(
      upsertCompanyProfileInputSchema.safeParse({
        tradingName: "ACME",
        currency: "USD",
      }).success,
    ).toBe(false);

    expect(
      upsertCompanyProfileInputSchema.safeParse({
        tradingName: "ACME",
        country: "RO",
        postalCode: "123",
        city: "București",
      }).success,
    ).toBe(false);
  });
});

describe("Etapa 22 PublicCompanyView mapping", () => {
  it("maps SECURITY DEFINER row without private/timestamp fields", () => {
    const view = mapPublicCompanyRow({
      legal_name: "ACME Motors SRL",
      trading_name: "ACME Motors",
      tax_id: "1593112",
      registration_number: "J40/1234/2020",
      entity_type: "srl",
      public_email: "contact@acme.test",
      public_phone: "+40722123456",
      website: "https://acme.test",
      registered_address: "Str. Exemplu 1",
      showroom_address: null,
      city: "București",
      county: "București",
      country: "RO",
      postal_code: "010101",
      business_hours: { mon: { open: "09:00", close: "18:00" } },
      logo_path: "tenants/acme/logo.webp",
      favicon_path: null,
      currency: "EUR",
    });

    expect(view).toMatchObject({
      legalName: "ACME Motors SRL",
      taxId: "1593112",
      publicEmail: "contact@acme.test",
      currency: "EUR",
    } satisfies Partial<PublicCompanyView>);
    expect(view).not.toHaveProperty("tenantId");
    expect(view).not.toHaveProperty("createdAt");
    expect(view).not.toHaveProperty("iban");
  });

  it("returns null for missing row", () => {
    expect(mapPublicCompanyRow(null)).toBeNull();
  });
});

describe("Etapa 22 storefront footer company fields", () => {
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

  it("adds email/website links from company without inventing contacts", () => {
    expect(storefrontFooterContactLinks(view())).toEqual([]);
    expect(
      storefrontFooterContactLinks(
        view({
          company: {
            publicEmail: "contact@acme.test",
            website: "https://acme.test",
          },
        }),
      ),
    ).toEqual([
      { href: "mailto:contact@acme.test", label: "Email" },
      { href: "https://acme.test", label: "Website", external: true },
    ]);
  });

  it("builds address and legal lines only when company data exists", () => {
    expect(storefrontFooterAddressLine(undefined)).toBeNull();
    expect(storefrontFooterLegalLine(undefined)).toBeNull();
    expect(
      storefrontFooterAddressLine({
        showroomAddress: "Bd. Unirii 10",
        city: "București",
        postalCode: "030011",
      }),
    ).toBe("Bd. Unirii 10, 030011 București");
    expect(
      storefrontFooterLegalLine({
        legalName: "ACME Motors SRL",
        taxId: "1593112",
      }),
    ).toBe("ACME Motors SRL · CUI 1593112");
  });

  it("prefers branding phone over company phone for footer Telefon link", () => {
    expect(
      storefrontFooterContactLinks(
        view({
          phone: "+40722111111",
          company: { publicPhone: "+40722999999" },
        }),
      )[0],
    ).toEqual({ href: "tel:+40722111111", label: "Telefon" });
  });
});
