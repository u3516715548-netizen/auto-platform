import type { ConsentState, PublicMarketingRuntimeView } from "@auto-platform/types";
import { DEFAULT_CONSENT_STATE } from "@/lib/consent/consent-state";

export type TrackingRuntimeSnapshot = {
  tenantSlug: string;
  consent: ConsentState;
  /** True when public view has GTM and preferGtm — native GA4 events must not fire. */
  preferGtm: boolean;
  gtmConfigured: boolean;
  ga4Configured: boolean;
};

const EMPTY: TrackingRuntimeSnapshot = {
  tenantSlug: "",
  consent: DEFAULT_CONSENT_STATE,
  preferGtm: false,
  gtmConfigured: false,
  ga4Configured: false,
};

let snapshot: TrackingRuntimeSnapshot = EMPTY;

export function getTrackingRuntimeSnapshot(): TrackingRuntimeSnapshot {
  return snapshot;
}

export function setTrackingRuntimeSnapshot(
  next: Partial<TrackingRuntimeSnapshot> & { tenantSlug?: string },
): void {
  snapshot = {
    ...snapshot,
    ...next,
    consent: next.consent ?? snapshot.consent,
  };
}

export function registerMarketingRuntimeView(
  tenantSlug: string,
  marketing: PublicMarketingRuntimeView,
): void {
  setTrackingRuntimeSnapshot({
    tenantSlug,
    preferGtm: marketing.preferGtm && Boolean(marketing.gtmContainerId),
    gtmConfigured: Boolean(marketing.gtmContainerId),
    ga4Configured: Boolean(marketing.ga4MeasurementId),
  });
}

export function resetTrackingRuntimeSnapshotForTests(): void {
  snapshot = { ...EMPTY, consent: { ...DEFAULT_CONSENT_STATE } };
}
