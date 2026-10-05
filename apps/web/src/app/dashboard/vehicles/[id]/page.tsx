import Link from "next/link";
import { randomUUID } from "node:crypto";
import { notFound } from "next/navigation";
import { getTenantVehicleById } from "@/lib/vehicles/get-vehicle";
import { canMutateVehicle } from "@/lib/vehicles/permissions";
import { canShowCreateReservationCta } from "@/lib/reservations/reservation-permissions";
import { getActiveReservationIdForVehicle } from "@/lib/reservations/list-reservations";
import { reservationDetailPath, vehiclesPath } from "@/lib/dashboard/nav";
import { vehicleStatusLabel } from "@/lib/vehicles/status-label";
import { EditVehicleForm } from "@/components/vehicles/edit-vehicle-form";
import { VehicleStatusForm } from "@/components/vehicles/vehicle-status-form";
import { ArchiveVehicleForm } from "@/components/vehicles/archive-vehicle-form";
import { VehicleGallerySection } from "@/components/vehicles/vehicle-gallery-section";
import { CreateReservationForm } from "@/components/reservations/create-reservation-form";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { secondaryLinkClassName } from "@/lib/ui/form-styles";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; status?: string }>;
};

/**
 * Vehicle detail / edit (4D + 4E + 11C reservation polish). Cross-tenant IDs → 404.
 */
export default async function DashboardVehicleEditPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = await searchParams;
  const access = await getTenantVehicleById(id);

  if (!access) {
    notFound();
  }

  const { vehicle, session } = access;
  const canMutate = canMutateVehicle(session.membership.role);
  const canReserve = canShowCreateReservationCta(session.membership.role, vehicle.status);
  const isArchived = vehicle.status === "archived";
  const showCreateReservation = canReserve;
  const reservationIdempotencyKey = showCreateReservation ? randomUUID() : null;

  const activeReservationId =
    vehicle.status === "reserved"
      ? await getActiveReservationIdForVehicle(vehicle.id)
      : null;

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-2xl flex-col gap-5 sm:gap-6">
      <div className="flex min-w-0 flex-col gap-2">
        <p className="text-sm font-medium tracking-wide text-teal-800 uppercase">Vehicule</p>
        <h2 className="break-words text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">
          {vehicle.make} {vehicle.model}
        </h2>
        <p className="text-sm leading-6 text-zinc-600">
          {canMutate
            ? "Editează datele, statusul sau arhivează vehiculul pe dealerul curent."
            : "Vizualizare read-only — rolul tău nu permite modificări."}
        </p>
        <p className="break-all font-mono text-xs text-zinc-500">
          {vehicle.slug} · {vehicleStatusLabel(vehicle.status)}
        </p>
      </div>

      {query.saved === "1" ? (
        <FeedbackBanner variant="success">Modificările au fost salvate.</FeedbackBanner>
      ) : null}

      {query.status === "1" ? (
        <FeedbackBanner variant="success">Statusul a fost actualizat.</FeedbackBanner>
      ) : null}

      {!canMutate ? (
        <FeedbackBanner variant="info">
          Contul are rol de vizualizare. Poți citi detaliile, dar serverul respinge orice mutație.
        </FeedbackBanner>
      ) : null}

      {showCreateReservation && reservationIdempotencyKey ? (
        <section
          aria-labelledby="vehicle-reserve-heading"
          className="rounded-lg border border-teal-200 bg-teal-50/40 p-3 sm:p-5"
        >
          <h3 id="vehicle-reserve-heading" className="mb-3 text-base font-semibold text-zinc-900">
            Rezervare
          </h3>
          <CreateReservationForm
            vehicleId={vehicle.id}
            idempotencyKey={reservationIdempotencyKey}
          />
        </section>
      ) : null}

      {vehicle.status === "reserved" ? (
        <div className="flex min-w-0 flex-col gap-3 rounded-lg border border-sky-200 bg-sky-50/50 p-3 sm:p-4">
          <FeedbackBanner variant="info">Vehicul rezervat.</FeedbackBanner>
          {activeReservationId ? (
            <Link
              href={reservationDetailPath(activeReservationId)}
              className={`${secondaryLinkClassName} w-full sm:w-auto`}
            >
              Gestionează rezervarea
            </Link>
          ) : null}
        </div>
      ) : null}

      {vehicle.status === "sold" ? (
        <FeedbackBanner variant="info">Vehicul vândut.</FeedbackBanner>
      ) : null}

      <VehicleGallerySection vehicleId={vehicle.id} />

      <section className="rounded-lg border border-zinc-200 bg-white p-3 sm:p-5">
        <h3 className="mb-4 text-base font-semibold text-zinc-900">Editare inventar</h3>
        <EditVehicleForm vehicle={vehicle} readOnly={!canMutate} />
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-3 sm:p-5">
        <h3 className="mb-4 text-base font-semibold text-zinc-900">Status</h3>
        <VehicleStatusForm
          vehicleId={vehicle.id}
          currentStatus={vehicle.status}
          readOnly={!canMutate}
        />
      </section>

      {canMutate ? (
        <section className="rounded-lg border border-amber-300 bg-amber-50 p-3 sm:p-5">
          <h3 className="mb-3 text-base font-semibold text-zinc-900">Arhivare</h3>
          <ArchiveVehicleForm vehicleId={vehicle.id} alreadyArchived={isArchived} />
        </section>
      ) : null}

      <p className="text-center text-sm text-zinc-600">
        <Link
          href={isArchived ? vehiclesPath({ view: "archived" }) : vehiclesPath()}
          className="inline-flex min-h-11 items-center underline underline-offset-2 hover:text-zinc-900"
        >
          Înapoi la listă
        </Link>
      </p>
    </div>
  );
}
