import type { ConsentState } from "@auto-platform/types";
import {
  MARKETING_EVENT_DEFINITIONS,
  type AutobearMarketingEventName,
  type MarketingEventParams,
} from "@/lib/marketing/events-contract";
import { sanitizeMarketingEventParams } from "@/lib/marketing/sanitize-event-params";
import {
  getTrackingRuntimeSnapshot,
  type TrackingRuntimeSnapshot,
} from "@/lib/marketing/tracking-runtime-registry";
import {
  DEFAULT_CONSENT_STATE,
  readConsentFromDocumentCookie,
} from "@/lib/consent/consent-state";

export type EmitMarketingEventOptions = {
  /** Skip if this key was already emitted (page-scoped or submit-scoped). */
  dedupeKey?: string;
  /** Override consent read (tests). */
  consent?: ConsentState;
  /** Override runtime snapshot (tests). */
  runtime?: TrackingRuntimeSnapshot;
  /** Force destinations (tests). */
  forceDestinations?: { dataLayer: boolean; ga4Direct: boolean };
};

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    __abMarketingDedupe?: Set<string>;
  }
}

function getDedupeSet(): Set<string> {
  if (typeof window === "undefined") return new Set();
  if (!window.__abMarketingDedupe) {
    window.__abMarketingDedupe = new Set();
  }
  return window.__abMarketingDedupe;
}

/** Test helper — clears in-memory dedupe. */
export function clearMarketingEventDedupeForTests(): void {
  if (typeof window !== "undefined") {
    window.__abMarketingDedupe = new Set();
  }
}

export function consentAllowsEvent(
  event: AutobearMarketingEventName,
  consent: ConsentState,
): boolean {
  const def = MARKETING_EVENT_DEFINITIONS[event];
  if (def.consent === "analytics") {
    return consent.analytics === true;
  }
  return consent.analytics === true || consent.marketing === true;
}

export function resolveEventDestinations(
  runtime: TrackingRuntimeSnapshot,
  consent: ConsentState,
  event: AutobearMarketingEventName,
): { dataLayer: boolean; ga4Direct: boolean } {
  if (!consentAllowsEvent(event, consent)) {
    return { dataLayer: false, ga4Direct: false };
  }

  // GTM-first: when GTM is the configured path, only dataLayer (GTM consumes).
  // Direct GA4 only when GTM is not the preferred/configured runtime.
  const gtmPath = runtime.preferGtm && runtime.gtmConfigured;
  if (gtmPath) {
    return { dataLayer: true, ga4Direct: false };
  }

  const ga4Direct = runtime.ga4Configured && consent.analytics === true;
  // Still push dataLayer for consistency / future GTM add without double GA4.
  return { dataLayer: true, ga4Direct };
}

function pushDataLayer(eventName: string, params: MarketingEventParams): void {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: eventName,
    ...params,
  });
}

function pushGa4Direct(eventName: string, params: MarketingEventParams): void {
  if (typeof window === "undefined") return;
  if (typeof window.gtag !== "function") return;
  // Strip event_source from gtag params? Keep it — harmless custom dim candidate.
  window.gtag("event", eventName, params);
}

function resolveConsent(
  override?: ConsentState,
  runtime?: TrackingRuntimeSnapshot,
): ConsentState {
  if (override) return override;
  const fromCookie =
    typeof document !== "undefined" ? readConsentFromDocumentCookie() : null;
  if (fromCookie) return fromCookie;
  // Fallback: StorefrontMarketingRuntime keeps registry in sync with banner.
  return (runtime ?? getTrackingRuntimeSnapshot()).consent ?? DEFAULT_CONSENT_STATE;
}

/**
 * Emit a taxonomy event to dataLayer and/or direct GA4.
 * No-ops when consent blocks, trigger is absent, or dedupe hits.
 * Never sends Meta/TikTok/LinkedIn directly (v1 — GTM only).
 */
export function emitMarketingEvent(
  event: AutobearMarketingEventName,
  rawParams?: Record<string, unknown> | MarketingEventParams,
  options?: EmitMarketingEventOptions,
): { emitted: boolean; reason?: string } {
  const def = MARKETING_EVENT_DEFINITIONS[event];
  if (def.triggerStatus === "absent") {
    return { emitted: false, reason: "trigger_absent" };
  }

  if (typeof window === "undefined") {
    return { emitted: false, reason: "ssr" };
  }

  if (options?.dedupeKey) {
    const set = getDedupeSet();
    if (set.has(options.dedupeKey)) {
      return { emitted: false, reason: "deduped" };
    }
  }

  const runtime = options?.runtime ?? getTrackingRuntimeSnapshot();
  const consent = resolveConsent(options?.consent, runtime);

  const destinations =
    options?.forceDestinations ?? resolveEventDestinations(runtime, consent, event);

  if (!destinations.dataLayer && !destinations.ga4Direct) {
    return { emitted: false, reason: "consent_blocked" };
  }

  const tenantSlug = runtime.tenantSlug || undefined;
  const params = sanitizeMarketingEventParams({
    ...(tenantSlug ? { tenant_slug: tenantSlug } : {}),
    ...rawParams,
  });

  if (destinations.dataLayer) {
    pushDataLayer(def.dataLayerEvent, params);
  }
  if (destinations.ga4Direct) {
    pushGa4Direct(def.ga4Event, params);
  }

  if (options?.dedupeKey) {
    getDedupeSet().add(options.dedupeKey);
  }

  if (
    process.env.NODE_ENV === "development" &&
    typeof window !== "undefined" &&
    (window as unknown as { __AB_TRACK_DEBUG?: boolean }).__AB_TRACK_DEBUG
  ) {
    console.debug("[ab-track]", event, {
      dataLayer: destinations.dataLayer,
      ga4Direct: destinations.ga4Direct,
      keys: Object.keys(params),
    });
  }

  return { emitted: true };
}

/** Infer contact click event from href. */
export function emitContactClickFromHref(
  href: string,
  sourceContext: string,
): ReturnType<typeof emitMarketingEvent> | null {
  const lower = href.trim().toLowerCase();
  if (lower.startsWith("tel:")) {
    return emitMarketingEvent("click_phone", {
      contact_method: "phone",
      source_context: sourceContext,
    });
  }
  if (lower.includes("wa.me") || lower.includes("whatsapp")) {
    return emitMarketingEvent("click_whatsapp", {
      contact_method: "whatsapp",
      source_context: sourceContext,
    });
  }
  if (lower.startsWith("mailto:")) {
    return emitMarketingEvent("click_email", {
      contact_method: "email",
      source_context: sourceContext,
    });
  }
  return null;
}
