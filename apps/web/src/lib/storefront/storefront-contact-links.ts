/**
 * Safe public contact hrefs — input must already be DTO-normalized E.164 (`+…`).
 * Never accept free-form URLs from branding.
 */

export function buildStorefrontTelHref(phoneE164: string): string {
  return `tel:${phoneE164}`;
}

/** wa.me expects digits only (no +). */
export function buildStorefrontWhatsAppHref(whatsappE164: string): string {
  const digits = whatsappE164.replace(/\D/g, "");
  return `https://wa.me/${digits}`;
}

export const STOREFRONT_CONTACT_ANCHOR_ID = "contact" as const;

export function storefrontContactHref(): string {
  return `#${STOREFRONT_CONTACT_ANCHOR_ID}`;
}
