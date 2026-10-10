import type { PublicTenantView } from "@/lib/storefront/resolve-public-tenant";
import {
  STOREFRONT_CONTACT_ANCHOR_ID,
  buildStorefrontTelHref,
  buildStorefrontWhatsAppHref,
  storefrontContactHref,
} from "@/lib/storefront/storefront-contact-links";

export type StickyContactSurface = "catalog" | "detail";

export type StickyContactAction = {
  kind: "message" | "call" | "whatsapp";
  label: string;
  href: string;
  external?: boolean;
};

/**
 * Builds sticky bar actions for a public surface.
 * Catalog never includes Mesaj. Detail includes Mesaj only when leadsEnabled.
 */
export function resolveStickyContactActions(
  tenant: Pick<PublicTenantView, "phone" | "whatsapp" | "leadsEnabled" | "company">,
  surface: StickyContactSurface,
): StickyContactAction[] {
  const actions: StickyContactAction[] = [];
  const phone = tenant.phone ?? tenant.company?.publicPhone;

  if (surface === "detail" && tenant.leadsEnabled) {
    actions.push({
      kind: "message",
      label: "Mesaj",
      href: storefrontContactHref(),
    });
  }

  if (phone) {
    actions.push({
      kind: "call",
      label: "Sună",
      href: buildStorefrontTelHref(phone),
    });
  }

  if (tenant.whatsapp) {
    actions.push({
      kind: "whatsapp",
      label: "WhatsApp",
      href: buildStorefrontWhatsAppHref(tenant.whatsapp),
      external: true,
    });
  }

  return actions;
}

export function stickyContactBarVisible(
  tenant: Pick<PublicTenantView, "phone" | "whatsapp" | "leadsEnabled" | "company">,
  surface: StickyContactSurface,
): boolean {
  return resolveStickyContactActions(tenant, surface).length > 0;
}

export { STOREFRONT_CONTACT_ANCHOR_ID };
