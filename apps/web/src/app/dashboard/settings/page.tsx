import { requireMembership } from "@/lib/auth/require-membership";
import { getTenantBrandingForSettings } from "@/lib/tenant/get-tenant-branding";
import { BRANDING_UPDATE_ROLES } from "@/lib/tenant/branding-merge";
import { listSelectableStorefrontTemplates } from "@/lib/storefront/templates/registry";
import { BrandingSettingsForm } from "@/components/dashboard/branding-settings-form";
import { hasAnyRole } from "@auto-platform/core";

/**
 * Dashboard branding / storefront settings (Etapa 9C).
 * Route: /dashboard/settings
 */
export default async function DashboardSettingsPage() {
  const session = await requireMembership();
  const branding = await getTenantBrandingForSettings(session);
  const canEdit = hasAnyRole(session.membership.role, BRANDING_UPDATE_ROLES);
  const templates = listSelectableStorefrontTemplates();

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <p className="text-sm font-medium tracking-wide text-teal-800 uppercase">Setări</p>
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Branding storefront
        </h2>
        <p className="max-w-2xl text-sm leading-6 text-zinc-600">
          Personalizează culoarea accent, template-ul, contactul public și destinatarii de notificare
          lead pentru <span className="font-medium text-zinc-800">{session.tenant.name}</span>.
        </p>
      </section>

      <BrandingSettingsForm
        branding={branding}
        templates={templates}
        readOnly={!canEdit}
      />
    </div>
  );
}
