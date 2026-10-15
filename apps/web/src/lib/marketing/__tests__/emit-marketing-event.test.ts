import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ConsentState } from "@auto-platform/types";
import {
  clearMarketingEventDedupeForTests,
  consentAllowsEvent,
  emitContactClickFromHref,
  emitMarketingEvent,
  resolveEventDestinations,
} from "@/lib/marketing/emit-marketing-event";
import {
  assertNoPiiInParams,
  sanitizeMarketingEventParams,
} from "@/lib/marketing/sanitize-event-params";
import { MARKETING_EVENT_DEFINITIONS } from "@/lib/marketing/events-contract";
import {
  resetTrackingRuntimeSnapshotForTests,
  setTrackingRuntimeSnapshot,
} from "@/lib/marketing/tracking-runtime-registry";
import { acceptAllConsent, rejectAllConsent } from "@/lib/consent/consent-state";

const analyticsOnly: ConsentState = {
  version: 1,
  preferences: false,
  analytics: true,
  marketing: false,
  updatedAt: 1,
};

const marketingOnly: ConsentState = {
  version: 1,
  preferences: false,
  analytics: false,
  marketing: true,
  updatedAt: 1,
};

function installWindow() {
  const dataLayer: unknown[] = [];
  const gtag = vi.fn((...args: unknown[]) => {
    dataLayer.push(args);
  });
  // @ts-expect-error test window shim
  globalThis.window = {
    dataLayer,
    gtag,
    __abMarketingDedupe: new Set(),
  };
  // @ts-expect-error document cookie stub
  globalThis.document = { cookie: "" };
  return { dataLayer, gtag };
}

describe("Phase 5 marketing events", () => {
  beforeEach(() => {
    resetTrackingRuntimeSnapshotForTests();
    clearMarketingEventDedupeForTests();
    installWindow();
    setTrackingRuntimeSnapshot({
      tenantSlug: "acme",
      preferGtm: true,
      gtmConfigured: true,
      ga4Configured: true,
      consent: acceptAllConsent(1),
    });
  });

  afterEach(() => {
    // @ts-expect-error cleanup
    delete globalThis.window;
    // @ts-expect-error cleanup
    delete globalThis.document;
  });

  it("sanitizes params and strips PII-like keys", () => {
    const cleaned = sanitizeMarketingEventParams({
      tenant_slug: "acme",
      vehicle_slug: "bmw-320",
      email: "ana@example.com",
      phone: "+40700",
      message: "secret",
      vin: "WBA123",
      make: "BMW",
      price: 25000,
    } as Record<string, unknown>);
    expect(cleaned.email).toBeUndefined();
    expect(cleaned.phone).toBeUndefined();
    expect(cleaned.message).toBeUndefined();
    expect(cleaned.vin).toBeUndefined();
    expect(cleaned.make).toBe("BMW");
    expect(cleaned.price).toBe(25000);
    expect(cleaned.event_source).toBe("autobear");
    expect(assertNoPiiInParams(cleaned)).toBe(true);
  });

  it("blocks analytics events without analytics consent", () => {
    expect(consentAllowsEvent("page_view", rejectAllConsent(1))).toBe(false);
    expect(consentAllowsEvent("page_view", analyticsOnly)).toBe(true);
    expect(consentAllowsEvent("page_view", marketingOnly)).toBe(false);
  });

  it("allows generate_lead with marketing-only consent", () => {
    expect(consentAllowsEvent("generate_lead", marketingOnly)).toBe(true);
    expect(consentAllowsEvent("click_phone", marketingOnly)).toBe(true);
    expect(consentAllowsEvent("view_item", marketingOnly)).toBe(false);
  });

  it("GTM path pushes dataLayer only (no ga4 direct)", () => {
    const dest = resolveEventDestinations(
      {
        tenantSlug: "acme",
        preferGtm: true,
        gtmConfigured: true,
        ga4Configured: true,
        consent: acceptAllConsent(1),
      },
      acceptAllConsent(1),
      "view_item",
    );
    expect(dest).toEqual({ dataLayer: true, ga4Direct: false });
  });

  it("GA4 direct fallback only without GTM + analytics consent", () => {
    const dest = resolveEventDestinations(
      {
        tenantSlug: "acme",
        preferGtm: false,
        gtmConfigured: false,
        ga4Configured: true,
        consent: analyticsOnly,
      },
      analyticsOnly,
      "view_item",
    );
    expect(dest).toEqual({ dataLayer: true, ga4Direct: true });

    const blocked = resolveEventDestinations(
      {
        tenantSlug: "acme",
        preferGtm: false,
        gtmConfigured: false,
        ga4Configured: true,
        consent: rejectAllConsent(1),
      },
      rejectAllConsent(1),
      "view_item",
    );
    expect(blocked).toEqual({ dataLayer: false, ga4Direct: false });
  });

  it("emits page_view once per dedupe key", () => {
    const { dataLayer } = installWindow();
    setTrackingRuntimeSnapshot({
      tenantSlug: "acme",
      preferGtm: true,
      gtmConfigured: true,
      ga4Configured: false,
      consent: acceptAllConsent(1),
    });

    const a = emitMarketingEvent(
      "page_view",
      { page_type: "catalog", page_path: "/" },
      { consent: acceptAllConsent(1), dedupeKey: "page_view:/" },
    );
    const b = emitMarketingEvent(
      "page_view",
      { page_type: "catalog", page_path: "/" },
      { consent: acceptAllConsent(1), dedupeKey: "page_view:/" },
    );
    expect(a.emitted).toBe(true);
    expect(b.emitted).toBe(false);
    expect(b.reason).toBe("deduped");
    const events = dataLayer.filter(
      (row) => typeof row === "object" && row !== null && (row as { event?: string }).event === "page_view",
    );
    expect(events).toHaveLength(1);
  });

  it("does not emit without consent", () => {
    const { dataLayer } = installWindow();
    const result = emitMarketingEvent(
      "view_item",
      { vehicle_slug: "x" },
      { consent: rejectAllConsent(1) },
    );
    expect(result.emitted).toBe(false);
    expect(result.reason).toBe("consent_blocked");
    expect(dataLayer).toHaveLength(0);
  });

  it("with GTM active, generate_lead goes to dataLayer and not gtag event", () => {
    const { dataLayer, gtag } = installWindow();
    setTrackingRuntimeSnapshot({
      tenantSlug: "acme",
      preferGtm: true,
      gtmConfigured: true,
      ga4Configured: true,
      consent: acceptAllConsent(1),
    });
    const result = emitMarketingEvent(
      "generate_lead",
      { lead_type: "contact", vehicle_slug: "bmw-320" },
      { consent: acceptAllConsent(1) },
    );
    expect(result.emitted).toBe(true);
    expect(
      dataLayer.some(
        (row) =>
          typeof row === "object" &&
          row !== null &&
          (row as { event?: string }).event === "generate_lead",
      ),
    ).toBe(true);
    expect(gtag).not.toHaveBeenCalledWith("event", "generate_lead", expect.anything());
  });

  it("GA4 direct fallback calls gtag when GTM absent", () => {
    const { gtag } = installWindow();
    setTrackingRuntimeSnapshot({
      tenantSlug: "beta",
      preferGtm: false,
      gtmConfigured: false,
      ga4Configured: true,
      consent: analyticsOnly,
    });
    emitMarketingEvent(
      "view_item",
      { vehicle_slug: "audi-a4", make: "Audi" },
      { consent: analyticsOnly },
    );
    expect(gtag).toHaveBeenCalledWith(
      "event",
      "view_item",
      expect.objectContaining({
        vehicle_slug: "audi-a4",
        tenant_slug: "beta",
        event_source: "autobear",
      }),
    );
  });

  it("tenant slug is taken from runtime snapshot (A/B isolation)", () => {
    const { dataLayer } = installWindow();
    setTrackingRuntimeSnapshot({
      tenantSlug: "tenant-a",
      preferGtm: true,
      gtmConfigured: true,
      ga4Configured: false,
      consent: acceptAllConsent(1),
    });
    emitMarketingEvent("search", { search_term: "bmw" }, { consent: acceptAllConsent(1) });
    const row = dataLayer.find(
      (r) => typeof r === "object" && r !== null && (r as { event?: string }).event === "search",
    ) as { tenant_slug?: string };
    expect(row.tenant_slug).toBe("tenant-a");

    setTrackingRuntimeSnapshot({ tenantSlug: "tenant-b" });
    emitMarketingEvent("search", { search_term: "audi" }, { consent: acceptAllConsent(1) });
    const rowB = dataLayer.find(
      (r) =>
        typeof r === "object" &&
        r !== null &&
        (r as { event?: string }).event === "search" &&
        (r as { search_term?: string }).search_term === "audi",
    ) as { tenant_slug?: string };
    expect(rowB.tenant_slug).toBe("tenant-b");
  });

  it("click helpers map tel / wa / mailto", () => {
    installWindow();
    setTrackingRuntimeSnapshot({
      tenantSlug: "acme",
      preferGtm: true,
      gtmConfigured: true,
      ga4Configured: false,
      consent: acceptAllConsent(1),
    });
    expect(emitContactClickFromHref("tel:+40700", "footer")?.emitted).toBe(true);
    expect(emitContactClickFromHref("https://wa.me/40700", "sticky")?.emitted).toBe(true);
    expect(emitContactClickFromHref("mailto:office@dealer.test", "footer")?.emitted).toBe(true);
    expect(emitContactClickFromHref("/vehicles/x", "nav")).toBeNull();
  });

  it("absent triggers do not emit", () => {
    expect(emitMarketingEvent("click_directions", {}, { consent: acceptAllConsent(1) })).toEqual({
      emitted: false,
      reason: "trigger_absent",
    });
    expect(emitMarketingEvent("reservation_start", {}, { consent: acceptAllConsent(1) })).toEqual({
      emitted: false,
      reason: "trigger_absent",
    });
  });

  it("contract marks reservation and directions as absent; generate_lead recommended", () => {
    expect(MARKETING_EVENT_DEFINITIONS.reservation_submit.triggerStatus).toBe("absent");
    expect(MARKETING_EVENT_DEFINITIONS.click_directions.triggerStatus).toBe("absent");
    expect(MARKETING_EVENT_DEFINITIONS.generate_lead.ga4Recommended).toBe(true);
    expect(MARKETING_EVENT_DEFINITIONS.saved_vehicle.dataLayerEvent).toBe("saved_vehicle");
  });

  it("customize analytics-only: view_item ok, generate_lead ok, marketing clicks ok via analytics", () => {
    expect(consentAllowsEvent("view_item", analyticsOnly)).toBe(true);
    expect(consentAllowsEvent("generate_lead", analyticsOnly)).toBe(true);
    expect(consentAllowsEvent("click_whatsapp", analyticsOnly)).toBe(true);
  });
});
