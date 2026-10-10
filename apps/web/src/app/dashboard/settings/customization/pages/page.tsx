import { requireSettingsOwner } from "@/lib/auth/require-settings-owner";
import { listTenantPagesForSettings } from "@/lib/cms/list-tenant-pages";
import { CmsPagesManager } from "@/components/dashboard/cms-pages-manager";

/**
 * CMS pages admin — owner only (Etapa 23A).
 */
export default async function DashboardSettingsPagesPage() {
  const session = await requireSettingsOwner();
  const pages = await listTenantPagesForSettings(session);

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <p className="text-sm font-medium tracking-wide text-teal-800 uppercase">Personalizare</p>
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">Pagini</h2>
        <p className="max-w-2xl text-sm leading-6 text-zinc-600">
          Administrează paginile de conținut și legale ale storefront-ului. Draft-urile nu sunt
          publice.
        </p>
      </section>

      <CmsPagesManager pages={pages} />
    </div>
  );
}
