import { requireSettingsOwner } from "@/lib/auth/require-settings-owner";
import { getTenantBrandingForSettings } from "@/lib/tenant/get-tenant-branding";
import { getSeoSettingsForSettings } from "@/lib/seo/get-seo-settings";
import { BrandingSettingsForm } from "@/components/dashboard/branding-settings-form";
import { SeoSettingsForm } from "@/components/dashboard/seo-settings-form";
import { FeedbackBanner } from "@/components/ui/feedback-banner";

/**
 * Storefront preferences — branding/contact + SEO de bază (Etapa 23A).
 */
export default async function DashboardSettingsPreferencesPage() {
  const session = await requireSettingsOwner();
  const [branding, seo] = await Promise.all([
    getTenantBrandingForSettings(session),
    getSeoSettingsForSettings(session),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <p className="text-sm font-medium tracking-wide text-teal-800 uppercase">Personalizare</p>
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">Preferințe</h2>
        <p className="max-w-2xl text-sm leading-6 text-zinc-600">
          Identitate vizuală, contact public și SEO de bază pentru{" "}
          <span className="font-medium text-zinc-800">{session.tenant.name}</span>.
        </p>
      </section>

      <div className="rounded-lg border border-zinc-200 bg-white p-4 sm:p-5">
        <BrandingSettingsForm branding={branding} readOnly={false} />
      </div>

      <section className="flex flex-col gap-3">
        <h3 className="text-lg font-semibold text-zinc-900">SEO de bază</h3>
        <FeedbackBanner variant="info">
          Sitemap, robots, JSON-LD, Open Graph și marketing pixels rămân pentru etapele 23B/23C.
        </FeedbackBanner>
        <div className="rounded-lg border border-zinc-200 bg-white p-4 sm:p-5">
          <SeoSettingsForm settings={seo} />
        </div>
      </section>
    </div>
  );
}
