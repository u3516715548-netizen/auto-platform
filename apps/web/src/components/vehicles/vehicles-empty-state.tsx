import Link from "next/link";
import { vehicleCreatePath } from "@/lib/dashboard/nav";
import { primaryLinkClassName } from "@/lib/ui/form-styles";

type VehiclesEmptyStateProps = {
  canCreate: boolean;
};

export function VehiclesEmptyState({ canCreate }: VehiclesEmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-300 bg-white px-4 py-10 text-center sm:px-6">
      <h3 className="text-base font-semibold text-zinc-900">Niciun vehicul în stoc</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-600">
        {canCreate
          ? "Adaugă primul vehicul pentru acest dealer. Va apărea imediat în listă."
          : "Stocul este gol. Contul tău are rol de vizualizare — un coleg cu drepturi de editare poate adăuga vehicule."}
      </p>
      {canCreate ? (
        <Link href={vehicleCreatePath()} className={`${primaryLinkClassName} mt-5 w-full sm:w-auto`}>
          Adaugă vehicul
        </Link>
      ) : null}
    </div>
  );
}
