import { describe, expect, it } from "vitest";
import {
  acceptAllConsent,
  GOOGLE_CONSENT_DEFAULT_DENIED,
  parseConsentCookieValue,
  rejectAllConsent,
  resolveMarketingLoadPlan,
  serializeConsentCookieValue,
  toGoogleConsentMode,
} from "@/lib/consent/consent-state";
import { buildVerificationMetadata } from "@/lib/marketing/build-verification-metadata";
import { buildForcedNoindexMetadata } from "@/lib/seo/build-page-metadata";

describe("Phase 4 consent state", () => {
  it("defaults denied for Google Consent Mode v2 fields", () => {
    expect(GOOGLE_CONSENT_DEFAULT_DENIED).toEqual({
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
  });

  it("maps categories to Google consent fields", () => {
    expect(toGoogleConsentMode(rejectAllConsent(1))).toEqual(GOOGLE_CONSENT_DEFAULT_DENIED);
    expect(toGoogleConsentMode(acceptAllConsent(1))).toEqual({
      analytics_storage: "granted",
      ad_storage: "granted",
      ad_user_data: "granted",
      ad_personalization: "granted",
    });
    expect(
      toGoogleConsentMode({
        version: 1,
        preferences: true,
        analytics: true,
        marketing: false,
        updatedAt: 1,
      }),
    ).toEqual({
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
  });

  it("round-trips cookie payload without PII", () => {
    const state = acceptAllConsent(12345);
    const raw = serializeConsentCookieValue(state);
    expect(raw.includes("email")).toBe(false);
    expect(parseConsentCookieValue(raw)).toEqual(state);
    expect(parseConsentCookieValue("garbage")).toBeNull();
    expect(parseConsentCookieValue('<script>x</script>')).toBeNull();
  });

  it("necessary-only / reject blocks all loaders", () => {
    const plan = resolveMarketingLoadPlan(
      rejectAllConsent(1),
      true,
      {
        gtmContainerId: "GTM-ABC",
        ga4MeasurementId: "G-ABC",
        metaPixelId: "123",
      },
    );
    expect(plan).toEqual({
      loadGtm: false,
      loadGa4Direct: false,
      loadGoogleAdsDirect: false,
      loadMeta: false,
      loadTiktok: false,
      loadLinkedin: false,
    });
  });

  it("accept all + GTM prefers GTM and skips native pixels", () => {
    const plan = resolveMarketingLoadPlan(acceptAllConsent(1), true, {
      gtmContainerId: "GTM-ABC",
      ga4MeasurementId: "G-ABC",
      metaPixelId: "1234567890",
      tiktokPixelId: "CABC",
      linkedinPartnerId: "99999",
    });
    expect(plan.loadGtm).toBe(true);
    expect(plan.loadGa4Direct).toBe(false);
    expect(plan.loadMeta).toBe(false);
    expect(plan.loadTiktok).toBe(false);
    expect(plan.loadLinkedin).toBe(false);
  });

  it("analytics-only without GTM loads GA4 only", () => {
    const plan = resolveMarketingLoadPlan(
      {
        version: 1,
        preferences: false,
        analytics: true,
        marketing: false,
        updatedAt: 1,
      },
      false,
      {
        ga4MeasurementId: "G-ABC12",
        metaPixelId: "1234567890",
        googleAdsConversionId: "AW-1",
      },
    );
    expect(plan.loadGa4Direct).toBe(true);
    expect(plan.loadMeta).toBe(false);
    expect(plan.loadGoogleAdsDirect).toBe(false);
  });

  it("marketing-only without GTM loads pixels not GA4", () => {
    const plan = resolveMarketingLoadPlan(
      {
        version: 1,
        preferences: false,
        analytics: false,
        marketing: true,
        updatedAt: 1,
      },
      false,
      {
        ga4MeasurementId: "G-ABC12",
        metaPixelId: "1234567890",
        tiktokPixelId: "CABCDEF1",
        linkedinPartnerId: "12345",
      },
    );
    expect(plan.loadGa4Direct).toBe(false);
    expect(plan.loadMeta).toBe(true);
    expect(plan.loadTiktok).toBe(true);
    expect(plan.loadLinkedin).toBe(true);
  });
});

describe("Phase 4 verification metadata", () => {
  it("emits verification when configured", () => {
    const meta = buildVerificationMetadata({
      preferGtm: false,
      verification: {
        google: "gsc-token",
        bing: "bing-token",
        metaDomain: "meta-token",
        pinterest: "pin-token",
      },
    });
    expect(meta?.verification?.google).toBe("gsc-token");
    expect(meta?.verification?.other).toMatchObject({
      "msvalidate.01": "bing-token",
      "facebook-domain-verification": "meta-token",
      "p:domain_verify": "pin-token",
    });
  });

  it("omits verification when empty", () => {
    expect(
      buildVerificationMetadata({ preferGtm: false, verification: {} }),
    ).toBeUndefined();
  });

  it("compara/salvate noindex still forced", () => {
    expect(buildForcedNoindexMetadata("x").robots).toEqual({ index: false, follow: false });
  });
});
