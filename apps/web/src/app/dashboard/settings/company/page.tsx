import { requireSettingsOwner } from "@/lib/auth/require-settings-owner";
import { getTenantBrandingForSettings } from "@/lib/tenant/get-tenant-branding";
import { CompanySettingsForm } from "@/components/dashboard/company-settings-form";

/**
 * Company / contact details — owner only. Most fields await schema migration.
 */
export default async function DashboardSettingsCompanyPage() {
  const session = await requireSettingsOwner();
  const branding = await getTenantBrandingForSettings(session);

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <p className="text-sm font-medium tracking-wide text-teal-800 uppercase">Setări</p>
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Detalii firmă și contact
        </h2>
        <p className="max-w-2xl text-sm leading-6 text-zinc-600">
          Datele dealerului pentru{" "}
          <span className="font-medium text-zinc-800">{session.tenant.name}</span>. Câmpurile
          private nu apar pe storefront până nu există un DTO public whitelist.
        </p>
      </section>

      <div className="rounded-lg border border-zinc-200 bg-white p-4 sm:p-5">
        <CompanySettingsForm
          commercialName={session.tenant.name}
          publicPhone={branding.phone ?? null}
          publicWhatsapp={branding.whatsapp ?? null}
        />
      </div>
    </div>
  );
}
