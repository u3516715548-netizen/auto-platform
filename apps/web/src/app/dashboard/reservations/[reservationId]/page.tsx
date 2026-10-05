import Link from "next/link";
import { notFound } from "next/navigation";
import { getTenantReservationById } from "@/lib/reservations/list-reservations";
import { canMutateReservation } from "@/lib/reservations/reservation-permissions";
import {
  formatExpiresInRo,
  formatReservationDateTimeRo,
  reservationStatusHelpMessage,
} from "@/lib/reservations/reservation-list-filter";
import {
  reservationStatusBadgeClass,
  reservationStatusLabel,
} from "@/lib/reservations/status-label";
import { reservationsPath, vehicleEditPath } from "@/lib/dashboard/nav";
import { ReservationActions } from "@/components/reservations/reservation-actions";
import { FeedbackBanner } from "@/components/ui/feedback-banner";

type PageProps = {
  params: Promise<{ reservationId: string }>;
  searchParams: Promise<{ created?: string; cancelled?: string; converted?: string }>;
};

/**
 * Reservation detail (11B/11C). Cross-tenant / invalid id → 404.
 */
export default async function DashboardReservationDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { reservationId } = await params;
  const query = await searchParams;
  const access = await getTenantReservationById(reservationId);

  if (!access) {
    notFound();
  }

  const { reservation, session } = access;
  const canMutate = canMutateReservation(session.membership.role);
  const isActive = reservation.status === "active";
  const showActions = canMutate && isActive;
  const statusHelp = reservationStatusHelpMessage(reservation.status);
  const vehicleLabel = reservation.vehicle
    ? `${reservation.vehicle.make} ${reservation.vehicle.model}`
    : "Vehicul";

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-2xl flex-col gap-5 sm:gap-6">
      <header className="flex min-w-0 flex-col gap-2">
        <p className="text-sm font-medium tracking-wide text-teal-800 uppercase">Rezervări</p>
        <h2 className="break-words text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">
          {vehicleLabel}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium ${reservationStatusBadgeClass(reservation.status)}`}
          >
            {reservationStatusLabel(reservation.status)}
          </span>
          <time className="text-sm text-zinc-600" dateTime={reservation.createdAt.toISOString()}>
            Creată la {formatReservationDateTimeRo(reservation.createdAt)}
          </time>
        </div>
        <p className="text-sm leading-6 text-zinc-600">
          {canMutate
            ? isActive
              ? "Poți anula rezervarea sau o poți marca drept vânzare."
              : "Rezervarea nu mai este activă — acțiunile nu sunt disponibile."
            : "Vizualizare read-only — rolul tău nu permite modificări."}
        </p>
      </header>

      {query.created === "1" ? (
        <FeedbackBanner variant="success">Rezervarea a fost creată.</FeedbackBanner>
      ) : null}
      {query.cancelled === "1" ? (
        <FeedbackBanner variant="success">Rezervarea a fost anulată.</FeedbackBanner>
      ) : null}
      {query.converted === "1" ? (
        <FeedbackBanner variant="success">Rezervarea a fost marcată ca vândută.</FeedbackBanner>
      ) : null}
      {!canMutate ? (
        <FeedbackBanner variant="info">
          Contul are rol de vizualizare. Poți citi detaliile, dar serverul respinge orice mutație.
        </FeedbackBanner>
      ) : null}
      {!isActive && statusHelp ? (
        <FeedbackBanner variant="info">{statusHelp}</FeedbackBanner>
      ) : null}

      <section
        aria-labelledby="reservation-meta-heading"
        className="rounded-lg border border-zinc-200 bg-white p-3 sm:p-5"
      >
        <h3 id="reservation-meta-heading" className="mb-4 text-base font-semibold text-zinc-900">
          Detalii
        </h3>
        <dl className="grid gap-3 text-sm">
          <div>
            <dt className="text-xs font-medium tracking-wide text-zinc-500 uppercase">Vehicul</dt>
            <dd className="mt-1 text-zinc-900">
              {reservation.vehicle ? (
                <Link
                  href={vehicleEditPath(reservation.vehicle.id)}
                  className="underline-offset-2 hover:underline"
                >
                  {reservation.vehicle.make} {reservation.vehicle.model}
                </Link>
              ) : (
                "—"
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium tracking-wide text-zinc-500 uppercase">Status</dt>
            <dd className="mt-1 text-zinc-900">{reservationStatusLabel(reservation.status)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium tracking-wide text-zinc-500 uppercase">Creată la</dt>
            <dd className="mt-1 text-zinc-900">
              <time dateTime={reservation.createdAt.toISOString()}>
                {formatReservationDateTimeRo(reservation.createdAt)}
              </time>
            </dd>
          </div>
          {isActive || reservation.status === "expired" ? (
            <div>
              <dt className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
                Expiră la
              </dt>
              <dd className="mt-1 text-zinc-900">
                <time dateTime={reservation.expiresAt.toISOString()}>
                  {formatReservationDateTimeRo(reservation.expiresAt)}
                </time>
                {isActive ? (
                  <span className="mt-1 block text-sm text-zinc-600">
                    {formatExpiresInRo(reservation.expiresAt)}
                  </span>
                ) : null}
              </dd>
            </div>
          ) : null}
          {reservation.creator ? (
            <div>
              <dt className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
                Creată de
              </dt>
              <dd className="mt-1 text-zinc-900">{reservation.creator.displayName}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      {isActive && statusHelp ? (
        <section
          aria-labelledby="reservation-expiry-help"
          className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 sm:p-5"
        >
          <h3 id="reservation-expiry-help" className="mb-2 text-base font-semibold text-zinc-900">
            La expirare
          </h3>
          <p className="text-sm leading-6 text-zinc-600">{statusHelp}</p>
        </section>
      ) : null}

      {showActions ? (
        <section
          aria-labelledby="reservation-actions-heading"
          className="rounded-lg border border-zinc-200 bg-white p-3 sm:p-5"
        >
          <h3
            id="reservation-actions-heading"
            className="mb-4 text-base font-semibold text-zinc-900"
          >
            Acțiuni
          </h3>
          <ReservationActions reservationId={reservation.id} />
        </section>
      ) : null}

      <p className="text-center text-sm text-zinc-600">
        <Link
          href={reservationsPath()}
          className="inline-flex min-h-11 items-center underline underline-offset-2 hover:text-zinc-900"
        >
          Înapoi la listă
        </Link>
      </p>
    </div>
  );
}
