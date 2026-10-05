import Link from "next/link";
import { formatMileageKmRo, formatPriceEurRo } from "@auto-platform/types";
import type { VehicleListItem } from "@/lib/vehicles/list-vehicles";
import { vehicleEditPath } from "@/lib/dashboard/nav";
import { vehicleStatusLabel } from "@/lib/vehicles/status-label";
import { secondaryLinkClassName } from "@/lib/ui/form-styles";

type VehicleListProps = {
  vehicles: VehicleListItem[];
  canMutate: boolean;
};

export function VehicleList({ vehicles, canMutate }: VehicleListProps) {
  return (
    <ul className="flex flex-col gap-3">
      {vehicles.map((vehicle) => {
        const href = vehicleEditPath(vehicle.id);
        const actionLabel = canMutate ? "Editează" : "Detalii";
        const muted = vehicle.status === "archived";

        return (
          <li
            key={vehicle.id}
            className={`min-w-0 rounded-lg border bg-white p-3 shadow-sm sm:p-4 ${
              muted ? "border-zinc-300" : "border-zinc-200"
            }`}
          >
            <div className="flex min-w-0 flex-col gap-3">
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="min-w-0 flex-1">
                  <Link
                    href={href}
                    className="break-words text-base font-semibold tracking-tight text-zinc-900 underline-offset-2 hover:underline focus-visible:rounded-sm"
                  >
                    {vehicle.make} {vehicle.model}
                  </Link>
                  <p className="mt-1 text-sm text-zinc-600">
                    {vehicle.year} · {formatMileageKmRo(vehicle.mileage)}
                  </p>
                  <p className="mt-1 break-all font-mono text-xs text-zinc-500">{vehicle.slug}</p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                  <p className="text-base font-semibold text-zinc-900">
                    {formatPriceEurRo(vehicle.price)}
                  </p>
                  <span className="inline-flex rounded-md bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-800">
                    {vehicleStatusLabel(vehicle.status)}
                  </span>
                </div>
              </div>
              <Link href={href} className={`${secondaryLinkClassName} w-full sm:w-auto`}>
                {actionLabel}
              </Link>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
