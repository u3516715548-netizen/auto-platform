import { requireSettingsOwner } from "@/lib/auth/require-settings-owner";
import { getTenantBrandingForSettings } from "@/lib/tenant/get-tenant-branding";
import { listPreviewableStorefrontTemplates } from "@/lib/storefront/templates/registry";
import { ThemeGallery } from "@/components/dashboard/themes/theme-gallery";

/**
 * Theme gallery + active theme — owner only.
 */
export default async function DashboardSettingsThemesPage() {
  const session = await requireSettingsOwner();
  const branding = await getTenantBrandingForSettings(session);
  const templates = listPreviewableStorefrontTemplates();

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <p className="text-sm font-medium tracking-wide text-teal-800 uppercase">Personalizare</p>
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">Teme</h2>
        <p className="max-w-2xl text-sm leading-6 text-zinc-600">
          Alege și previzualizează template-ul storefront pentru{" "}
          <span className="font-medium text-zinc-800">{session.tenant.name}</span>. Culorile și
          contactul public se gestionează la Preferințe.
        </p>
      </section>

      <ThemeGallery templates={templates} activeTemplateId={branding.templateId} />
    </div>
  );
}
