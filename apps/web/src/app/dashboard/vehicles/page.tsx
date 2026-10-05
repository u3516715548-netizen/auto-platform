import Link from "next/link";
import { requireMembership } from "@/lib/auth/require-membership";
import { vehicleCreatePath, vehiclesPath } from "@/lib/dashboard/nav";
import { canMutateVehicle } from "@/lib/vehicles/permissions";
import {
  listTenantVehicles,
  resolveVehicleListView,
  type VehicleListItem,
} from "@/lib/vehicles/list-vehicles";
import { VehicleList } from "@/components/vehicles/vehicle-list";
import { VehiclesEmptyState } from "@/components/vehicles/vehicles-empty-state";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { primaryLinkClassName } from "@/lib/ui/form-styles";

type PageProps = {
  searchParams: Promise<{ view?: string; notice?: string }>;
};

/**
 * Tenant vehicle list (4C–4E).
 */
export default async function DashboardVehiclesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const view = resolveVehicleListView(params.view);
  const { membership } = await requireMembership();
  const canMutate = canMutateVehicle(membership.role);

  let vehicles: VehicleListItem[] = [];
  let listError: string | null = null;
  try {
    vehicles = await listTenantVehicles(view);
  } catch {
    vehicles = [];
    listError = "Nu am putut încărca stocul. Reîncarcă pagina sau încearcă mai târziu.";
  }

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-sm font-medium tracking-wide text-teal-800 uppercase">Vehicule</p>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">
            {view === "archived" ? "Stoc arhivat" : "Stoc dealer"}
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-zinc-600">
            {view === "archived"
              ? "Vehicule arhivate logic — nu apar în stocul activ. Schimbă statusul ca să le reactivezi."
              : "Stocul activ exclude vehiculele arhivate. Deschide un vehicul pentru editare, status sau arhivare."}
          </p>
        </div>
        {canMutate && view === "active" ? (
          <Link href={vehicleCreatePath()} className={`${primaryLinkClassName} w-full sm:w-auto`}>
            Adaugă vehicul
          </Link>
        ) : null}
      </div>

      <div
        className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Filtru stoc vehicule"
      >
        <Link
          href={vehiclesPath()}
          role="tab"
          aria-selected={view === "active"}
          className={`inline-flex min-h-11 shrink-0 items-center rounded-md px-3.5 text-sm font-medium transition-colors ${
            view === "active"
              ? "bg-teal-800 text-white"
              : "bg-white text-zinc-800 ring-1 ring-zinc-300 hover:bg-zinc-50"
          }`}
        >
          Active
        </Link>
        <Link
          href={vehiclesPath({ view: "archived" })}
          role="tab"
          aria-selected={view === "archived"}
          className={`inline-flex min-h-11 shrink-0 items-center rounded-md px-3.5 text-sm font-medium transition-colors ${
            view === "archived"
              ? "bg-teal-800 text-white"
              : "bg-white text-zinc-800 ring-1 ring-zinc-300 hover:bg-zinc-50"
          }`}
        >
          Arhivate
        </Link>
      </div>

      {params.notice === "archived" ? (
        <FeedbackBanner variant="success">
          Vehiculul a fost arhivat și mutat în lista de arhivate.
        </FeedbackBanner>
      ) : null}

      {listError ? <FeedbackBanner variant="error">{listError}</FeedbackBanner> : null}

      {!listError && vehicles.length === 0 ? (
        view === "archived" ? (
          <div className="rounded-lg border border-dashed border-zinc-300 bg-white px-4 py-10 text-center">
            <p className="text-base font-medium text-zinc-900">Niciun vehicul arhivat</p>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-zinc-600">
              Când arhivezi din detalii, vehiculele apar aici. Stocul Active rămâne curat.
            </p>
          </div>
        ) : (
          <VehiclesEmptyState canCreate={canMutate} />
        )
      ) : null}

      {!listError && vehicles.length > 0 ? (
        <VehicleList vehicles={vehicles} canMutate={canMutate} />
      ) : null}
    </div>
  );
}
