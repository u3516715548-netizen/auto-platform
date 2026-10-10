import type { PublicTenantView } from "@/lib/storefront/resolve-public-tenant";
import { resolveStorefrontLayoutId } from "@/lib/storefront/templates/registry";
import { publicCatalogPath } from "@/lib/storefront/paths";
import {
  buildStorefrontTelHref,
  buildStorefrontWhatsAppHref,
} from "@/lib/storefront/storefront-contact-links";

/** Header CTA: contact when available, otherwise catalog — never invents numbers. */
export function resolveStorefrontHeaderCta(tenant: PublicTenantView): {
  href: string;
  label: string;
} {
  const catalogHref = publicCatalogPath();
  const phone = tenant.phone ?? tenant.company?.publicPhone;
  if (phone) {
    return { href: buildStorefrontTelHref(phone), label: "Sună" };
  }
  if (tenant.whatsapp) {
    return { href: buildStorefrontWhatsAppHref(tenant.whatsapp), label: "WhatsApp" };
  }
  return { href: catalogHref, label: "Vezi stocul" };
}

export function resolveStorefrontShellClass(templateId: string): string {
  return `storefront-${resolveStorefrontLayoutId(templateId)}`;
}

export function storefrontFooterContactLinks(tenant: PublicTenantView): Array<{
  href: string;
  label: string;
  external?: boolean;
}> {
  const links: Array<{ href: string; label: string; external?: boolean }> = [];
  const phone = tenant.phone ?? tenant.company?.publicPhone;
  if (phone) {
    links.push({ href: buildStorefrontTelHref(phone), label: "Telefon" });
  }
  if (tenant.whatsapp) {
    links.push({
      href: buildStorefrontWhatsAppHref(tenant.whatsapp),
      label: "WhatsApp",
      external: true,
    });
  }
  if (tenant.company?.publicEmail) {
    links.push({
      href: `mailto:${tenant.company.publicEmail}`,
      label: "Email",
    });
  }
  if (tenant.company?.website) {
    links.push({
      href: tenant.company.website,
      label: "Website",
      external: true,
    });
  }
  return links;
}

/** Compact public address line for footer — omits when empty. */
export function storefrontFooterAddressLine(
  company: PublicTenantView["company"],
): string | null {
  if (!company) return null;
  const parts = [
    company.showroomAddress || company.registeredAddress,
    [company.postalCode, company.city].filter(Boolean).join(" "),
    company.county,
  ].filter((part) => Boolean(part && String(part).trim()));
  if (parts.length === 0) return null;
  return parts.join(", ");
}

/** Legal identity line (name + CUI) for footer — omits when empty. */
export function storefrontFooterLegalLine(
  company: PublicTenantView["company"],
): string | null {
  if (!company) return null;
  const bits: string[] = [];
  if (company.legalName) bits.push(company.legalName);
  if (company.taxId) bits.push(`CUI ${company.taxId}`);
  if (company.registrationNumber) bits.push(company.registrationNumber);
  if (bits.length === 0) return null;
  return bits.join(" · ");
}
