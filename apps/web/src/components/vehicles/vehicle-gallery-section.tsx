import { listDashboardVehicleMedia } from "@/lib/media/list-vehicle-media";
import { requireStaffMediaSession } from "@/lib/media/vehicle-media-access";
import { canMutateVehicle } from "@/lib/vehicles/permissions";
import { VehicleGalleryManager } from "./vehicle-gallery-manager";

type VehicleGallerySectionProps = {
  vehicleId: string;
};

export async function VehicleGallerySection({ vehicleId }: VehicleGallerySectionProps) {
  const session = await requireStaffMediaSession();
  const items = await listDashboardVehicleMedia(session, vehicleId);
  const readOnly = !canMutateVehicle(session.membership.role);

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-3 sm:p-5">
      <h3 className="mb-1 text-base font-semibold text-zinc-900">Galerie foto</h3>
      <p className="mb-4 text-sm leading-6 text-zinc-600">
        Încarcă imagini pentru vehicul. Imaginea principală este prima din ordine (sortare 0).
        Publicul vede pozele doar când vehiculul este disponibil.
      </p>
      <VehicleGalleryManager
        key={items.map((item) => `${item.id}:${item.sortOrder}`).join("|")}
        vehicleId={vehicleId}
        initialItems={items}
        readOnly={readOnly}
      />
    </section>
  );
}
