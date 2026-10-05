import Link from "next/link";
import { requireMembership } from "@/lib/auth/require-membership";
import { vehiclesPath } from "@/lib/dashboard/nav";
import { membershipRoleLabel } from "@/lib/dashboard/role-label";

/**
 * Dashboard home (4B shell). Vehicle CRUD arrives in 4C–4D.
 */
export default async function DashboardHomePage() {
  const { user, tenant, membership } = await requireMembership();

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <p className="text-sm font-medium tracking-wide text-teal-800 uppercase">Prezentare</p>
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Bun venit, {user.profile.name}
        </h2>
        <p className="max-w-2xl text-sm leading-6 text-zinc-600">
          Ești autentificat pe dealerul <span className="font-medium text-zinc-800">{tenant.name}</span>.
          Stocul se gestionează din meniul Vehicule.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">Dealer</p>
          <p className="mt-2 text-sm font-semibold text-zinc-900">{tenant.name}</p>
          <p className="mt-1 font-mono text-xs text-zinc-500">{tenant.slug}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">Rol</p>
          <p className="mt-2 text-sm font-semibold text-zinc-900">
            {membershipRoleLabel(membership.role)}
          </p>
          <p className="mt-1 font-mono text-xs text-zinc-500">{membership.role}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">Cont</p>
          <p className="mt-2 break-all text-sm font-semibold text-zinc-900">{user.profile.email}</p>
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4 sm:p-5">
        <h3 className="text-base font-semibold text-zinc-900">Stoc vehicule</h3>
        <p className="mt-1 text-sm leading-6 text-zinc-600">
          Listează și creează vehicule pentru dealerul curent. Editarea și arhivarea urmează în 4D.
        </p>
        <Link
          href={vehiclesPath()}
          className="mt-4 inline-flex min-h-11 items-center justify-center rounded-md bg-teal-800 px-4 text-sm font-medium text-white transition-colors hover:bg-teal-900"
        >
          Deschide Vehicule
        </Link>
      </section>
    </div>
  );
}
