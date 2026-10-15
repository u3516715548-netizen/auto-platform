import { describe, expect, it } from "vitest";
import {
  marketingIntegrationStatus,
  normalizeGa4MeasurementId,
  normalizeGoogleAdsConversionId,
  normalizeGtmContainerId,
  normalizeLinkedinPartnerId,
  normalizeMetaPixelId,
  normalizeTiktokPixelId,
  sanitizeMarketingVerificationToken,
  upsertTenantMarketingIntegrationsInputSchema,
} from "@auto-platform/types";
import { buildMarketingOverviewStatus } from "@/lib/marketing/marketing-status";
import { rejectTenantIdFromForm } from "@/lib/vehicles/parse-update-form";
import {
  canAccessSettingsOwnerSection,
  isMarketingSectionActive,
  SETTINGS_NAV,
  settingsNavForRole,
} from "@/lib/dashboard/settings-nav";

describe("Phase 3 marketing ID validation", () => {
  it("normalizes provider IDs", () => {
    expect(normalizeGtmContainerId("gtm-abc12")).toBe("GTM-ABC12");
    expect(normalizeGtmContainerId("bad")).toBeNull();
    expect(normalizeGa4MeasurementId("g-xxxx12")).toBe("G-XXXX12");
    expect(normalizeGoogleAdsConversionId("123456789")).toBe("AW-123456789");
    expect(normalizeGoogleAdsConversionId("AW-123456789")).toBe("AW-123456789");
    expect(normalizeMetaPixelId("1234567890")).toBe("1234567890");
    expect(normalizeMetaPixelId("abc")).toBeNull();
    expect(normalizeTiktokPixelId("CABCDEF123")).toBe("CABCDEF123");
    expect(normalizeLinkedinPartnerId("987654")).toBe("987654");
  });

  it("rejects HTML/script in verification tokens", () => {
    expect(sanitizeMarketingVerificationToken("ok-token_123")).toBe("ok-token_123");
    expect(sanitizeMarketingVerificationToken('<script>alert(1)</script>')).toBeNull();
    expect(sanitizeMarketingVerificationToken("javascript:alert(1)")).toBeNull();
    expect(sanitizeMarketingVerificationToken("a\nb")).toBeNull();
  });

  it("upsert schema accepts valid payload and clears empties", () => {
    const ok = upsertTenantMarketingIntegrationsInputSchema.safeParse({
      gtmContainerId: "GTM-ABCDEF",
      gtmEnabled: true,
      ga4MeasurementId: "G-ABCDEF12",
      ga4Enabled: true,
      googleAdsConversionId: "AW-111111111",
      googleAdsConversionLabel: "label_1",
      googleAdsEnabled: false,
      metaPixelId: "123456789012345",
      metaPixelEnabled: true,
      tiktokPixelId: "",
      tiktokPixelEnabled: true,
      linkedinPartnerId: "",
      linkedinEnabled: true,
      googleSearchConsoleVerification: "gsc-token",
      bingWebmasterVerification: "",
      metaDomainVerification: "",
      pinterestVerification: "",
    });
    expect(ok.success).toBe(true);
    if (ok.success) {
      expect(ok.data.tiktokPixelId).toBeNull();
      expect(ok.data.googleAdsEnabled).toBe(false);
      expect(ok.data.googleSearchConsoleVerification).toBe("gsc-token");
    }
  });

  it("rejects invalid IDs and ads label without ID", () => {
    expect(
      upsertTenantMarketingIntegrationsInputSchema.safeParse({
        gtmContainerId: "NOPE",
        gtmEnabled: true,
        ga4MeasurementId: "",
        ga4Enabled: true,
        googleAdsConversionId: "",
        googleAdsConversionLabel: "",
        googleAdsEnabled: true,
        metaPixelId: "",
        metaPixelEnabled: true,
        tiktokPixelId: "",
        tiktokPixelEnabled: true,
        linkedinPartnerId: "",
        linkedinEnabled: true,
        googleSearchConsoleVerification: "",
        bingWebmasterVerification: "",
        metaDomainVerification: "",
        pinterestVerification: "",
      }).success,
    ).toBe(false);

    expect(
      upsertTenantMarketingIntegrationsInputSchema.safeParse({
        gtmContainerId: "",
        gtmEnabled: true,
        ga4MeasurementId: "",
        ga4Enabled: true,
        googleAdsConversionId: "",
        googleAdsConversionLabel: "orphan-label",
        googleAdsEnabled: true,
        metaPixelId: "",
        metaPixelEnabled: true,
        tiktokPixelId: "",
        tiktokPixelEnabled: true,
        linkedinPartnerId: "",
        linkedinEnabled: true,
        googleSearchConsoleVerification: "",
        bingWebmasterVerification: "",
        metaDomainVerification: "",
        pinterestVerification: "",
      }).success,
    ).toBe(false);
  });

  it("rejects tenant_id smuggling on forms", () => {
    const fd = new FormData();
    fd.set("tenantId", "evil");
    expect(rejectTenantIdFromForm(fd)).toBeTruthy();
  });
});

describe("Phase 3 marketing status + nav", () => {
  it("maps configured / disabled / not_configured", () => {
    expect(marketingIntegrationStatus(null, true)).toBe("not_configured");
    expect(marketingIntegrationStatus("GTM-X", true)).toBe("configured");
    expect(marketingIntegrationStatus("GTM-X", false)).toBe("disabled");
  });

  it("builds overview cards", () => {
    const cards = buildMarketingOverviewStatus({
      gtmContainerId: "GTM-A",
      gtmEnabled: true,
      ga4MeasurementId: "",
      ga4Enabled: true,
      googleAdsConversionId: "AW-1",
      googleAdsConversionLabel: "",
      googleAdsEnabled: false,
      metaPixelId: "",
      metaPixelEnabled: true,
      tiktokPixelId: "",
      tiktokPixelEnabled: true,
      linkedinPartnerId: "",
      linkedinEnabled: true,
      googleSearchConsoleVerification: "x",
      bingWebmasterVerification: "",
      metaDomainVerification: "",
      pinterestVerification: "",
    });
    expect(cards.find((c) => c.key === "gtm")?.status).toBe("configured");
    expect(cards.find((c) => c.key === "ads")?.status).toBe("disabled");
    expect(cards.find((c) => c.key === "ga4")?.status).toBe("not_configured");
  });

  it("exposes Marketing top-level owner-only nav", () => {
    const marketing = SETTINGS_NAV.find((i) => i.href === "/dashboard/settings/marketing");
    expect(marketing?.ownerOnly).toBe(true);
    expect(marketing?.children?.map((c) => c.label)).toEqual([
      "Overview",
      "SEO",
      "SEO Health",
      "Analytics & Ads",
      "Verification",
    ]);
    expect(settingsNavForRole("owner").some((i) => i.label === "Marketing")).toBe(true);
    expect(settingsNavForRole("sales").some((i) => i.label === "Marketing")).toBe(false);
    expect(canAccessSettingsOwnerSection("owner")).toBe(true);
    expect(canAccessSettingsOwnerSection("sales")).toBe(false);
    expect(isMarketingSectionActive("/dashboard/settings/marketing/analytics")).toBe(true);
  });
});
