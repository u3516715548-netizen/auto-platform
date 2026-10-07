import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  AuthRequiredError,
  MembershipRequiredError,
  TenantResolutionError,
} from "@auto-platform/core";
import { requireMembership } from "@/lib/auth/require-membership";
import { loginPath } from "@/lib/auth/auth-redirects";
import { getTenantBrandingForSettings } from "@/lib/tenant/get-tenant-branding";
import { listPublicVehicles } from "@/lib/storefront/public-vehicles";
import {
  getStorefrontTemplate,
  resolvePreviewableTemplateId,
} from "@/lib/storefront/templates/registry";
import { StorefrontTemplatePreview } from "@/components/dashboard/storefront-template-preview";

export const metadata: Metadata = {
  title: "Previzualizare template",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Authenticated, noindex iframe target for template settings preview.
 * Host tenant only — never accepts tenant_id from the client.
 */
export default async function StorefrontTemplatePreviewPage({ searchParams }: PageProps) {
  let session: Awaited<ReturnType<typeof requireMembership>>;
  try {
    session = await requireMembership();
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      redirect(loginPath({ auth: "required" }));
    }
    if (error instanceof TenantResolutionError) {
      redirect(loginPath({ error: "tenant" }));
    }
    if (error instanceof MembershipRequiredError) {
      redirect(loginPath({ error: "membership" }));
    }
    throw error;
  }

  const params = await searchParams;
  const raw = params.templateId;
  const templateId = resolvePreviewableTemplateId(
    Array.isArray(raw) ? raw[0] : raw,
  );
  const template = getStorefrontTemplate(templateId);
  const branding = await getTenantBrandingForSettings(session);

  let vehicles: Awaited<ReturnType<typeof listPublicVehicles>> = [];
  try {
    vehicles = await listPublicVehicles(session.tenant.tenantId);
  } catch {
    vehicles = [];
  }

  const previewVehicles = vehicles.slice(0, 6).map((v) => ({
    make: v.make,
    model: v.model,
    year: v.year,
    price: v.price,
    mileage: v.mileage,
    fuel: v.fuel,
    locationCity: v.locationCity,
    coverUrl: null as string | null,
  }));

  return (
    <StorefrontTemplatePreview
      templateId={template.id}
      tenantName={session.tenant.name}
      primaryColor={branding.primaryColor}
      vehicles={previewVehicles}
      comingSoon={template.status === "coming_soon"}
    />
  );
}
