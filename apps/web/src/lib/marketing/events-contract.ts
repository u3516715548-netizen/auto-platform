/**
 * Phase 5 â€” Autobear marketing event taxonomy.
 *
 * Naming:
 * - Internal name === dataLayer `event` === GA4 event name (where applicable).
 * - No `ab_` prefix on event names so GTM GA4 Event tags can map 1:1.
 * - Namespace via payload field `event_source: "autobear"`.
 *
 * Destinations (v1):
 * - Always prefer GTM dataLayer when GTM is the active runtime path.
 * - Direct GA4 (`gtag('event', ...)`) only when GTM is NOT configured/loaded.
 * - Meta / TikTok / LinkedIn: NO direct event API in v1 (avoid dirty dual-fires;
 *   configure those tags inside GTM).
 *
 * Consent (conservative):
 * - No push to dataLayer / gtag without the required consent category.
 * - Analytics events require `analytics`.
 * - Conversion / click events require `analytics` OR `marketing`
 *   (so GTM Ads tags can still receive when marketing-only consent loads GTM).
 *
 * Triggers marked `absent` are contract-only â€” do not invent fire sites.
 */

export const MARKETING_EVENT_SOURCE = "autobear" as const;

export type AutobearMarketingEventName =
  | "page_view"
  | "view_item_list"
  | "view_item"
  | "search"
  | "compare_add"
  | "saved_vehicle"
  | "finance_start"
  | "finance_submit"
  | "contact_start"
  | "generate_lead"
  | "click_phone"
  | "click_whatsapp"
  | "click_email"
  | "click_directions"
  | "reservation_start"
  | "reservation_submit";

/** Allowed non-PII param keys. Anything else is stripped. */
export const ALLOWED_EVENT_PARAM_KEYS = [
  "tenant_slug",
  "page_type",
  "page_path",
  "vehicle_slug",
  "make",
  "model",
  "year",
  "body_type",
  "fuel_type",
  "transmission",
  "price",
  "currency",
  "list_id",
  "list_name",
  "items_count",
  "search_term",
  "filter_count",
  "lead_type",
  "contact_method",
  "destination_type",
  "reservation_status",
  "source_context",
  "event_source",
] as const;

export type AllowedEventParamKey = (typeof ALLOWED_EVENT_PARAM_KEYS)[number];

export type MarketingEventParams = Partial<
  Record<AllowedEventParamKey, string | number | boolean>
>;

export type MarketingConsentGate = "analytics" | "analytics_or_marketing";

export type MarketingEventDestination = "dataLayer" | "ga4_direct";

export type MarketingEventDefinition = {
  name: AutobearMarketingEventName;
  /** GA4 / dataLayer event string â€” same as `name` for v1. */
  dataLayerEvent: string;
  ga4Event: string;
  consent: MarketingConsentGate;
  /** Recommended GA4 event when true. */
  ga4Recommended: boolean;
  triggerStatus: "wired" | "absent";
  triggerNote: string;
  destinations: MarketingEventDestination[];
};

export const MARKETING_EVENT_DEFINITIONS: Record<
  AutobearMarketingEventName,
  MarketingEventDefinition
> = {
  page_view: {
    name: "page_view",
    dataLayerEvent: "page_view",
    ga4Event: "page_view",
    consent: "analytics",
    ga4Recommended: true,
    triggerStatus: "wired",
    triggerNote: "Storefront route change (App Router pathname).",
    destinations: ["dataLayer", "ga4_direct"],
  },
  view_item_list: {
    name: "view_item_list",
    dataLayerEvent: "view_item_list",
    ga4Event: "view_item_list",
    consent: "analytics",
    ga4Recommended: true,
    triggerStatus: "wired",
    triggerNote: "Catalog results section mount / query change.",
    destinations: ["dataLayer", "ga4_direct"],
  },
  view_item: {
    name: "view_item",
    dataLayerEvent: "view_item",
    ga4Event: "view_item",
    consent: "analytics",
    ga4Recommended: true,
    triggerStatus: "wired",
    triggerNote: "Public vehicle detail page.",
    destinations: ["dataLayer", "ga4_direct"],
  },
  search: {
    name: "search",
    dataLayerEvent: "search",
    ga4Event: "search",
    consent: "analytics",
    ga4Recommended: true,
    triggerStatus: "wired",
    triggerNote: "Catalog with non-empty `q` query param.",
    destinations: ["dataLayer", "ga4_direct"],
  },
  compare_add: {
    name: "compare_add",
    dataLayerEvent: "compare_add",
    ga4Event: "compare_add",
    consent: "analytics",
    ga4Recommended: false,
    triggerStatus: "wired",
    triggerNote: "User adds vehicle to compare list (not remove).",
    destinations: ["dataLayer", "ga4_direct"],
  },
  saved_vehicle: {
    name: "saved_vehicle",
    dataLayerEvent: "saved_vehicle",
    ga4Event: "saved_vehicle",
    consent: "analytics",
    ga4Recommended: false,
    triggerStatus: "wired",
    triggerNote: "User adds vehicle to salvate (not remove).",
    destinations: ["dataLayer", "ga4_direct"],
  },
  finance_start: {
    name: "finance_start",
    dataLayerEvent: "finance_start",
    ga4Event: "finance_start",
    consent: "analytics_or_marketing",
    ga4Recommended: false,
    triggerStatus: "wired",
    triggerNote: "Opens finance apply dialog (AplicÄƒ acum).",
    destinations: ["dataLayer", "ga4_direct"],
  },
  finance_submit: {
    name: "finance_submit",
    dataLayerEvent: "finance_submit",
    ga4Event: "finance_submit",
    consent: "analytics_or_marketing",
    ga4Recommended: false,
    triggerStatus: "wired",
    triggerNote: "Finance application Server Action success.",
    destinations: ["dataLayer", "ga4_direct"],
  },
  contact_start: {
    name: "contact_start",
    dataLayerEvent: "contact_start",
    ga4Event: "contact_start",
    consent: "analytics_or_marketing",
    ga4Recommended: false,
    triggerStatus: "wired",
    triggerNote: "Sticky Mesaj / scroll-to-lead CTA.",
    destinations: ["dataLayer", "ga4_direct"],
  },
  generate_lead: {
    name: "generate_lead",
    dataLayerEvent: "generate_lead",
    ga4Event: "generate_lead",
    consent: "analytics_or_marketing",
    ga4Recommended: true,
    triggerStatus: "wired",
    triggerNote: "Lead form or finance form success (lead_type discriminates).",
    destinations: ["dataLayer", "ga4_direct"],
  },
  click_phone: {
    name: "click_phone",
    dataLayerEvent: "click_phone",
    ga4Event: "click_phone",
    consent: "analytics_or_marketing",
    ga4Recommended: false,
    triggerStatus: "wired",
    triggerNote: "tel: links (sticky, header, footer, mobile nav).",
    destinations: ["dataLayer", "ga4_direct"],
  },
  click_whatsapp: {
    name: "click_whatsapp",
    dataLayerEvent: "click_whatsapp",
    ga4Event: "click_whatsapp",
    consent: "analytics_or_marketing",
    ga4Recommended: false,
    triggerStatus: "wired",
    triggerNote: "wa.me links (sticky, header, footer).",
    destinations: ["dataLayer", "ga4_direct"],
  },
  click_email: {
    name: "click_email",
    dataLayerEvent: "click_email",
    ga4Event: "click_email",
    consent: "analytics_or_marketing",
    ga4Recommended: false,
    triggerStatus: "wired",
    triggerNote: "mailto: footer contact.",
    destinations: ["dataLayer", "ga4_direct"],
  },
  click_directions: {
    name: "click_directions",
    dataLayerEvent: "click_directions",
    ga4Event: "click_directions",
    consent: "analytics_or_marketing",
    ga4Recommended: false,
    triggerStatus: "absent",
    triggerNote: "No maps/directions CTA in public storefront UI yet.",
    destinations: ["dataLayer", "ga4_direct"],
  },
  reservation_start: {
    name: "reservation_start",
    dataLayerEvent: "reservation_start",
    ga4Event: "reservation_start",
    consent: "analytics_or_marketing",
    ga4Recommended: false,
    triggerStatus: "absent",
    triggerNote: "Reservations are dashboard-only; no public reservation flow.",
    destinations: ["dataLayer", "ga4_direct"],
  },
  reservation_submit: {
    name: "reservation_submit",
    dataLayerEvent: "reservation_submit",
    ga4Event: "reservation_submit",
    consent: "analytics_or_marketing",
    ga4Recommended: false,
    triggerStatus: "absent",
    triggerNote: "Reservations are dashboard-only; no public reservation flow.",
    destinations: ["dataLayer", "ga4_direct"],
  },
};

export type GenerateLeadEventParams = {
  lead_type: "contact" | "finance" | "other";
  vehicle_slug?: string;
  currency?: "EUR";
  price?: number;
  source_context?: string;
};
