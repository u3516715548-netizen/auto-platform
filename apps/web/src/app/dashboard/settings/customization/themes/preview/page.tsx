import { notFound } from "next/navigation";
import { requireSettingsOwner } from "@/lib/auth/require-settings-owner";
import { getTenantBrandingForSettings } from "@/lib/tenant/get-tenant-branding";
import {
  getStorefrontTemplate,
  resolvePreviewableTemplateId,
} from "@/lib/storefront/templates/registry";
import { ThemePreviewShell } from "@/components/dashboard/themes/theme-preview-shell";

type PageProps = {
  searchParams: Promise<{ templateId?: string | string[] }>;
};

/**
 * Full-screen demo theme preview — owner only, no real tenant inventory.
 */
export default async function DashboardThemePreviewPage({ searchParams }: PageProps) {
  const session = await requireSettingsOwner();
  const branding = await getTenantBrandingForSettings(session);
  const params = await searchParams;
  const raw = params.templateId;
  const templateId = resolvePreviewableTemplateId(Array.isArray(raw) ? raw[0] : raw);
  const template = getStorefrontTemplate(templateId);

  if (!template) {
    notFound();
  }

  return (
    <ThemePreviewShell
      template={template}
      isActive={branding.templateId === template.id}
    />
  );
}
