import { requireMembership } from "@/lib/auth/require-membership";
import { membershipRoleLabel } from "@/lib/dashboard/role-label";
import { ProfileSettingsForm } from "@/components/dashboard/profile-settings-form";

/**
 * Personal profile for the authenticated member (any role).
 */
export default async function DashboardSettingsGeneralPage() {
  const session = await requireMembership();
  const { profile } = session.user;

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <p className="text-sm font-medium tracking-wide text-teal-800 uppercase">Setări</p>
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">General</h2>
        <p className="max-w-2xl text-sm leading-6 text-zinc-600">
          Profilul tău personal în cadrul dealerului{" "}
          <span className="font-medium text-zinc-800">{session.tenant.name}</span>. Nu poți
          modifica profilul altor utilizatori.
        </p>
      </section>

      <div className="rounded-lg border border-zinc-200 bg-white p-4 sm:p-5">
        <ProfileSettingsForm
          name={profile.name}
          email={profile.email}
          roleLabel={membershipRoleLabel(session.membership.role)}
        />
      </div>
    </div>
  );
}
