import Link from "next/link";
import { redirect } from "next/navigation";
import { requireMembership } from "@/lib/auth/require-membership";
import { vehiclesPath } from "@/lib/dashboard/nav";
import { canCreateVehicle } from "@/lib/vehicles/permissions";
import { CreateVehicleForm } from "@/components/vehicles/create-vehicle-form";

/**
 * Create vehicle (4C). tenant_id is never accepted from the client.
 */
export default async function DashboardVehicleCreatePage() {
  const { membership } = await requireMembership();

  if (!canCreateVehicle(membership.role)) {
    redirect(vehiclesPath());
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium tracking-wide text-teal-800 uppercase">Vehicule</p>
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">Adaugă vehicul</h2>
        <p className="text-sm leading-6 text-zinc-600">
          Vehiculul este creat pentru dealerul din hostul curent. Nu trimite și nu alege un
          tenant_id din formular.
        </p>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-4 sm:p-5">
        <CreateVehicleForm />
      </div>

      <p className="text-center text-sm text-zinc-500">
        <Link href={vehiclesPath()} className="underline underline-offset-2 hover:text-zinc-800">
          Înapoi la listă
        </Link>
      </p>
    </div>
  );
}
