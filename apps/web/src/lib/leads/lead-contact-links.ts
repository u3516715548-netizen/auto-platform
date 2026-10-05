import { normalizePublicContactNumber } from "@auto-platform/types";

/**
 * Safe dashboard contact hrefs. Never invent WhatsApp from phone.
 */
export function leadMailtoHref(email: string | null | undefined): string | null {
  if (!email) return null;
  const trimmed = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) || trimmed.length > 160) {
    return null;
  }
  return `mailto:${trimmed}`;
}

export function leadTelHref(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const normalized = normalizePublicContactNumber(phone);
  if (!normalized) return null;
  return `tel:${normalized}`;
}
