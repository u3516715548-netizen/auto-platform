import { requireSettingsOwner } from "@/lib/auth/require-settings-owner";
import { getCompanyProfileForSettings } from "@/lib/settings/get-company-profile";
import { getTenantBrandingForSettings } from "@/lib/tenant/get-tenant-branding";
import { CompanySettingsForm } from "@/components/dashboard/company-settings-form";

/**
 * Company / contact details — owner only (edit).
 * Public storefront receives only PublicCompanyView, never this page's full row.
 */
export default async function DashboardSettingsCompanyPage() {
  const session = await requireSettingsOwner();
  const [branding, profile] = await Promise.all([
    getTenantBrandingForSettings(session),
    getCompanyProfileForSettings(session),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <p className="text-sm font-medium tracking-wide text-teal-800 uppercase">Setări</p>
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Detalii firmă și contact
        </h2>
        <p className="max-w-2xl text-sm leading-6 text-zinc-600">
          Datele dealerului pentru{" "}
          <span className="font-medium text-zinc-800">{session.tenant.name}</span>. Pe
          storefront apar doar câmpurile din proiectul public (fără date bancare sau
          secrete).
        </p>
      </section>

      <div className="rounded-lg border border-zinc-200 bg-white p-4 sm:p-5">
        <CompanySettingsForm
          profile={profile}
          brandingPhone={branding.phone ?? null}
          brandingWhatsapp={branding.whatsapp ?? null}
        />
      </div>
    </div>
  );
}
