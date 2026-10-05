import Link from "next/link";
import { requireMembership } from "@/lib/auth/require-membership";
import { reservationsPath, vehiclesPath } from "@/lib/dashboard/nav";
import {
  RESERVATION_LIST_FILTER_LABELS,
  resolveReservationListFilter,
} from "@/lib/reservations/reservation-list-filter";
import { listTenantReservations } from "@/lib/reservations/list-reservations";
import { ReservationList } from "@/components/reservations/reservation-list";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { primaryLinkClassName } from "@/lib/ui/form-styles";
import type { ReservationListFilter } from "@auto-platform/types";

type PageProps = {
  searchParams: Promise<{ filter?: string }>;
};

const FILTERS: ReservationListFilter[] = [
  "all",
  "active",
  "expired",
  "cancelled",
  "converted",
];

/**
 * Tenant reservation inbox (11B/11C). Isolated by Host membership.
 */
export default async function DashboardReservationsPage({ searchParams }: PageProps) {
  await requireMembership();
  const params = await searchParams;
  const filter = resolveReservationListFilter(params.filter);

  let rows: Awaited<ReturnType<typeof listTenantReservations>> = [];
  let listError: string | null = null;
  try {
    rows = await listTenantReservations(filter);
  } catch {
    rows = [];
    listError = "Nu am putut încărca rezervările. Reîncarcă pagina sau încearcă mai târziu.";
  }

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <header className="flex min-w-0 flex-col gap-2">
        <p className="text-sm font-medium tracking-wide text-teal-800 uppercase">Rezervări</p>
        <h2 className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">
          Rezervări active și istorice
        </h2>
        <p className="max-w-2xl text-sm leading-6 text-zinc-600">
          Hold-uri de 48 de ore pe inventarul dealerului curent. Vehiculul rezervat iese din
          catalogul public până la anulare, expirare sau conversie.
        </p>
      </header>

      <nav
        className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Filtru status rezervări"
      >
        {FILTERS.map((value) => {
          const href = value === "all" ? reservationsPath() : reservationsPath({ filter: value });
          const selected = filter === value;
          return (
            <Link
              key={value}
              href={href}
              aria-current={selected ? "page" : undefined}
              className={`inline-flex min-h-11 shrink-0 items-center rounded-md px-3.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 ${
                selected
                  ? "bg-teal-800 text-white"
                  : "bg-white text-zinc-800 ring-1 ring-zinc-300 hover:bg-zinc-50"
              }`}
            >
              {RESERVATION_LIST_FILTER_LABELS[value]}
            </Link>
          );
        })}
      </nav>

      {listError ? <FeedbackBanner variant="error">{listError}</FeedbackBanner> : null}

      {!listError && rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-white px-4 py-10 text-center">
          <p className="text-base font-medium text-zinc-900">Nu ai încă rezervări.</p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-zinc-600">
            Creează o rezervare din pagina unui vehicul disponibil.
          </p>
          <p className="mt-5">
            <Link href={vehiclesPath()} className={primaryLinkClassName}>
              Vezi vehiculele disponibile
            </Link>
          </p>
        </div>
      ) : null}

      {!listError && rows.length > 0 ? <ReservationList reservations={rows} /> : null}
    </div>
  );
}
