import type { ConsentState } from "@auto-platform/types";

/** Host-only cookie — never set Domain= so tenants stay isolated. */
export const CONSENT_COOKIE_NAME = "ab_consent";
export const CONSENT_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 180; // ~180 days
export const CONSENT_STATE_VERSION = 1 as const;

export const DEFAULT_CONSENT_STATE: ConsentState = {
  version: CONSENT_STATE_VERSION,
  preferences: false,
  analytics: false,
  marketing: false,
  updatedAt: 0,
};

export function acceptAllConsent(now = Date.now()): ConsentState {
  return {
    version: CONSENT_STATE_VERSION,
    preferences: true,
    analytics: true,
    marketing: true,
    updatedAt: now,
  };
}

export function rejectAllConsent(now = Date.now()): ConsentState {
  return {
    version: CONSENT_STATE_VERSION,
    preferences: false,
    analytics: false,
    marketing: false,
    updatedAt: now,
  };
}

export function parseConsentCookieValue(raw: string | null | undefined): ConsentState | null {
  if (!raw?.trim()) return null;
  try {
    const decoded = decodeURIComponent(raw.trim());
    const parsed = JSON.parse(decoded) as Partial<ConsentState>;
    if (parsed.version !== 1) return null;
    if (typeof parsed.preferences !== "boolean") return null;
    if (typeof parsed.analytics !== "boolean") return null;
    if (typeof parsed.marketing !== "boolean") return null;
    if (typeof parsed.updatedAt !== "number" || !Number.isFinite(parsed.updatedAt)) return null;
    return {
      version: 1,
      preferences: parsed.preferences,
      analytics: parsed.analytics,
      marketing: parsed.marketing,
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return null;
  }
}

export function serializeConsentCookieValue(state: ConsentState): string {
  return encodeURIComponent(
    JSON.stringify({
      version: CONSENT_STATE_VERSION,
      preferences: state.preferences,
      analytics: state.analytics,
      marketing: state.marketing,
      updatedAt: state.updatedAt,
    }),
  );
}

export function readConsentFromDocumentCookie(
  cookieSource = typeof document !== "undefined" ? document.cookie : "",
): ConsentState | null {
  const parts = cookieSource.split(";").map((p) => p.trim());
  for (const part of parts) {
    if (!part.startsWith(`${CONSENT_COOKIE_NAME}=`)) continue;
    return parseConsentCookieValue(part.slice(CONSENT_COOKIE_NAME.length + 1));
  }
  return null;
}

export function writeConsentDocumentCookie(state: ConsentState): void {
  if (typeof document === "undefined") return;
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = [
    `${CONSENT_COOKIE_NAME}=${serializeConsentCookieValue(state)}`,
    "Path=/",
    `Max-Age=${CONSENT_COOKIE_MAX_AGE_SEC}`,
    "SameSite=Lax",
    secure,
  ]
    .filter(Boolean)
    .join("");
}

/** Google Consent Mode v2 fields derived from our categories. */
export type GoogleConsentModeState = {
  analytics_storage: "granted" | "denied";
  ad_storage: "granted" | "denied";
  ad_user_data: "granted" | "denied";
  ad_personalization: "granted" | "denied";
};

export function toGoogleConsentMode(state: ConsentState): GoogleConsentModeState {
  const analytics = state.analytics ? "granted" : "denied";
  const ads = state.marketing ? "granted" : "denied";
  return {
    analytics_storage: analytics,
    ad_storage: ads,
    ad_user_data: ads,
    ad_personalization: ads,
  };
}

export const GOOGLE_CONSENT_DEFAULT_DENIED: GoogleConsentModeState = {
  analytics_storage: "denied",
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
};

/**
 * Which runtime loaders may run given consent + GTM-first policy.
 * Verification meta tags are not gated (not scripts).
 */
export function resolveMarketingLoadPlan(
  consent: ConsentState,
  preferGtm: boolean,
  ids: {
    gtmContainerId?: string;
    ga4MeasurementId?: string;
    googleAdsConversionId?: string;
    metaPixelId?: string;
    tiktokPixelId?: string;
    linkedinPartnerId?: string;
  },
): {
  loadGtm: boolean;
  loadGa4Direct: boolean;
  loadGoogleAdsDirect: boolean;
  loadMeta: boolean;
  loadTiktok: boolean;
  loadLinkedin: boolean;
} {
  const analyticsOk = consent.analytics === true;
  const marketingOk = consent.marketing === true;

  if (preferGtm && ids.gtmContainerId) {
    // GTM needs analytics OR marketing consent to load (tag container may fire either).
    const loadGtm = analyticsOk || marketingOk;
    return {
      loadGtm,
      loadGa4Direct: false,
      loadGoogleAdsDirect: false,
      loadMeta: false,
      loadTiktok: false,
      loadLinkedin: false,
    };
  }

  return {
    loadGtm: false,
    loadGa4Direct: analyticsOk && Boolean(ids.ga4MeasurementId),
    loadGoogleAdsDirect: marketingOk && Boolean(ids.googleAdsConversionId),
    loadMeta: marketingOk && Boolean(ids.metaPixelId),
    loadTiktok: marketingOk && Boolean(ids.tiktokPixelId),
    loadLinkedin: marketingOk && Boolean(ids.linkedinPartnerId),
  };
}
