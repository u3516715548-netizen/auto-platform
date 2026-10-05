import Link from "next/link";
import type { PublicVehicleDto } from "@/lib/storefront/public-vehicles";
import { publicVehiclePath } from "@/lib/storefront/paths";

type PublicVehicleListProps = {
  vehicles: PublicVehicleDto[];
  accent?: string | null;
};

function formatPrice(price: string, currency: string): string {
  const amount = Number(price);
  if (Number.isFinite(amount)) {
    return new Intl.NumberFormat("ro-RO", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  }
  return `${price} ${currency}`;
}

export function PublicVehicleList({ vehicles, accent }: PublicVehicleListProps) {
  const color = accent ?? "#0f766e";

  return (
    <ul className="flex flex-col gap-3">
      {vehicles.map((vehicle) => (
        <li
          key={vehicle.slug}
          className="min-w-0 rounded-lg border border-zinc-200 bg-white p-3 shadow-sm sm:p-4"
        >
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <Link
                href={publicVehiclePath(vehicle.slug)}
                className="break-words text-base font-semibold tracking-tight text-zinc-900 underline-offset-2 hover:underline"
              >
                {vehicle.make} {vehicle.model}
              </Link>
              <p className="mt-1 text-sm text-zinc-600">
                {vehicle.year} · {new Intl.NumberFormat("ro-RO").format(vehicle.mileage)} km
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:items-end">
              <p className="text-base font-semibold text-zinc-900">
                {formatPrice(vehicle.price, vehicle.currency)}
              </p>
              <Link
                href={publicVehiclePath(vehicle.slug)}
                className="inline-flex min-h-11 items-center justify-center rounded-md px-4 text-sm font-medium text-white"
                style={{ backgroundColor: color }}
              >
                Vezi detalii
              </Link>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
