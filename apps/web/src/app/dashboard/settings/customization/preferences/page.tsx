import { requireSettingsOwner } from "@/lib/auth/require-settings-owner";
import { getTenantBrandingForSettings } from "@/lib/tenant/get-tenant-branding";
import { BrandingSettingsForm } from "@/components/dashboard/branding-settings-form";
import { FeedbackBanner } from "@/components/ui/feedback-banner";

/**
 * Storefront preferences — existing branding/contact + future SEO placeholders.
 */
export default async function DashboardSettingsPreferencesPage() {
  const session = await requireSettingsOwner();
  const branding = await getTenantBrandingForSettings(session);

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <p className="text-sm font-medium tracking-wide text-teal-800 uppercase">Personalizare</p>
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">Preferințe</h2>
        <p className="max-w-2xl text-sm leading-6 text-zinc-600">
          Identitate vizuală și contact public pentru{" "}
          <span className="font-medium text-zinc-800">{session.tenant.name}</span>. Alegerea
          template-ului se face la Teme.
        </p>
      </section>

      <div className="rounded-lg border border-zinc-200 bg-white p-4 sm:p-5">
        <BrandingSettingsForm branding={branding} readOnly={false} />
      </div>

      <FeedbackBanner variant="info">
        Ulterior aici vor apărea și: titlu SEO, descriere SEO, favicon, limbă, monedă, comportament
        formular lead, analytics și opțiuni de indexare. Acestea nu sunt active încă.
      </FeedbackBanner>
    </div>
  );
}
