import {
  RESERVATION_LIST_FILTER_STATUSES,
  reservationListFilterSchema,
  type ReservationListFilter,
  type ReservationStatus,
} from "@auto-platform/types";

export function resolveReservationListFilter(raw: string | undefined): ReservationListFilter {
  const parsed = reservationListFilterSchema.safeParse(raw ?? "all");
  return parsed.success ? parsed.data : "all";
}

export function reservationStatusesForFilter(
  filter: ReservationListFilter,
): readonly ReservationStatus[] | null {
  return RESERVATION_LIST_FILTER_STATUSES[filter];
}

export const RESERVATION_LIST_FILTER_LABELS: Record<ReservationListFilter, string> = {
  all: "Toate",
  active: "Active",
  expired: "Expirate",
  cancelled: "Anulate",
  converted: "Convertite",
};

export function formatReservationDateTimeRo(value: Date): string {
  return new Intl.DateTimeFormat("ro-RO", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(value);
}

/**
 * Static relative expiry copy (no client countdown / polling).
 * Under one hour → fixed phrase (no minute timer).
 */
export function formatExpiresInRo(expiresAt: Date, now = new Date()): string {
  const ms = expiresAt.getTime() - now.getTime();
  if (ms <= 0) return "Expirată";
  const totalMinutes = Math.floor(ms / 60_000);
  const days = Math.floor(totalMinutes / (60 * 24));
  if (days >= 1) {
    return days === 1 ? "Expiră în 1 zi" : `Expiră în ${days} zile`;
  }
  const hours = Math.floor(totalMinutes / 60);
  if (hours >= 1) {
    return hours === 1 ? "Expiră în 1 oră" : `Expiră în ${hours} ore`;
  }
  return "Expiră în mai puțin de o oră";
}

/** Final-status help copy for reservation detail (11C). */
export function reservationStatusHelpMessage(
  status: ReservationStatus,
): string | null {
  switch (status) {
    case "active":
      return "Dacă nu este confirmată, rezervarea expiră, iar vehiculul revine în stoc.";
    case "expired":
      return "Rezervarea a expirat. Vehiculul a revenit în stoc.";
    case "cancelled":
      return "Rezervarea a fost anulată.";
    case "converted":
      return "Rezervarea a fost convertită în vânzare. Vehiculul este marcat ca vândut.";
    default:
      return null;
  }
}
