import Link from "next/link";
import type { ReservationListItem } from "@/lib/reservations/list-reservations";
import {
  formatExpiresInRo,
  formatReservationDateTimeRo,
} from "@/lib/reservations/reservation-list-filter";
import {
  reservationStatusBadgeClass,
  reservationStatusLabel,
} from "@/lib/reservations/status-label";
import { reservationDetailPath, vehicleEditPath } from "@/lib/dashboard/nav";
import { secondaryLinkClassName } from "@/lib/ui/form-styles";

type ReservationListProps = {
  reservations: ReservationListItem[];
};

export function ReservationList({ reservations }: ReservationListProps) {
  return (
    <>
      <div className="hidden min-w-0 overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm md:block">
        <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
          <caption className="sr-only">Lista rezervărilor</caption>
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs tracking-wide text-zinc-600 uppercase">
            <tr>
              <th scope="col" className="px-3 py-3 font-medium">
                Vehicul
              </th>
              <th scope="col" className="px-3 py-3 font-medium">
                Status
              </th>
              <th scope="col" className="px-3 py-3 font-medium">
                Creată la
              </th>
              <th scope="col" className="px-3 py-3 font-medium">
                Expiră
              </th>
              <th scope="col" className="px-3 py-3 font-medium">
                Creată de
              </th>
              <th scope="col" className="px-3 py-3 font-medium">
                <span className="sr-only">Acțiuni</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {reservations.map((row) => (
              <tr key={row.id} className="border-b border-zinc-100 last:border-0">
                <td className="max-w-[14rem] px-3 py-3 break-words font-medium text-zinc-900">
                  {row.vehicle ? (
                    <Link
                      href={vehicleEditPath(row.vehicle.id)}
                      className="underline-offset-2 hover:underline"
                    >
                      {row.vehicle.make} {row.vehicle.model}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-3 py-3">
                  <span
                    className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${reservationStatusBadgeClass(row.status)}`}
                  >
                    {reservationStatusLabel(row.status)}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-zinc-700">
                  <time dateTime={row.createdAt.toISOString()}>
                    {formatReservationDateTimeRo(row.createdAt)}
                  </time>
                </td>
                <td className="px-3 py-3 text-zinc-700">
                  {row.status === "active" ? (
                    <div className="flex flex-col gap-0.5">
                      <time dateTime={row.expiresAt.toISOString()}>
                        Expiră la {formatReservationDateTimeRo(row.expiresAt)}
                      </time>
                      <span className="text-xs text-zinc-500">
                        {formatExpiresInRo(row.expiresAt)}
                      </span>
                    </div>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="max-w-[10rem] px-3 py-3 break-words text-zinc-700">
                  {row.creator?.displayName ?? "—"}
                </td>
                <td className="px-3 py-3">
                  <Link href={reservationDetailPath(row.id)} className={secondaryLinkClassName}>
                    Vezi
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-3 md:hidden">
        {reservations.map((row) => (
          <li
            key={row.id}
            className="min-w-0 rounded-lg border border-zinc-200 bg-white p-3 shadow-sm sm:p-4"
          >
            <div className="flex min-w-0 flex-col gap-3">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words text-base font-semibold text-zinc-900">
                    {row.vehicle ? (
                      <Link
                        href={vehicleEditPath(row.vehicle.id)}
                        className="underline-offset-2 hover:underline"
                      >
                        {row.vehicle.make} {row.vehicle.model}
                      </Link>
                    ) : (
                      "Vehicul indisponibil"
                    )}
                  </p>
                  <p className="mt-1 text-sm text-zinc-600">
                    <time dateTime={row.createdAt.toISOString()}>
                      Creată la {formatReservationDateTimeRo(row.createdAt)}
                    </time>
                  </p>
                </div>
                <span
                  className={`inline-flex shrink-0 items-center rounded-md px-2.5 py-1 text-xs font-medium ${reservationStatusBadgeClass(row.status)}`}
                >
                  {reservationStatusLabel(row.status)}
                </span>
              </div>
              <dl className="grid gap-2 text-sm">
                {row.status === "active" ? (
                  <div>
                    <dt className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
                      Expiră
                    </dt>
                    <dd className="mt-0.5 text-zinc-800">
                      <time dateTime={row.expiresAt.toISOString()}>
                        Expiră la {formatReservationDateTimeRo(row.expiresAt)}
                      </time>
                      <span className="mt-0.5 block text-xs text-zinc-500">
                        {formatExpiresInRo(row.expiresAt)}
                      </span>
                    </dd>
                  </div>
                ) : null}
                {row.creator ? (
                  <div>
                    <dt className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
                      Creată de
                    </dt>
                    <dd className="mt-0.5 text-zinc-800">{row.creator.displayName}</dd>
                  </div>
                ) : null}
              </dl>
              <Link
                href={reservationDetailPath(row.id)}
                className={`${secondaryLinkClassName} w-full`}
              >
                Vezi
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
