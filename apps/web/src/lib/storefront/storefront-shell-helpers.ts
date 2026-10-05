import type { PublicTenantView } from "@/lib/storefront/resolve-public-tenant";
import { getStorefrontTemplate } from "@/lib/storefront/templates/registry";
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
  if (tenant.phone) {
    return { href: buildStorefrontTelHref(tenant.phone), label: "Sună" };
  }
  if (tenant.whatsapp) {
    return { href: buildStorefrontWhatsAppHref(tenant.whatsapp), label: "WhatsApp" };
  }
  return { href: catalogHref, label: "Vezi stocul" };
}

export function resolveStorefrontShellClass(templateId: PublicTenantView["templateId"]): string {
  const template = getStorefrontTemplate(templateId);
  return `storefront-${template.id}`;
}

export function storefrontFooterContactLinks(tenant: PublicTenantView): Array<{
  href: string;
  label: string;
  external?: boolean;
}> {
  const links: Array<{ href: string; label: string; external?: boolean }> = [];
  if (tenant.phone) {
    links.push({ href: buildStorefrontTelHref(tenant.phone), label: "Telefon" });
  }
  if (tenant.whatsapp) {
    links.push({
      href: buildStorefrontWhatsAppHref(tenant.whatsapp),
      label: "WhatsApp",
      external: true,
    });
  }
  return links;
}
