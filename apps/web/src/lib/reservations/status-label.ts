import type { ReservationStatus } from "@auto-platform/types";

const STATUS_LABELS: Record<ReservationStatus, string> = {
  active: "Activă",
  expired: "Expirată",
  cancelled: "Anulată",
  converted: "Convertită",
};

export function reservationStatusLabel(status: ReservationStatus): string {
  return STATUS_LABELS[status] ?? status;
}

/** Visual + text cue — never rely on color alone. */
export function reservationStatusBadgeClass(status: ReservationStatus): string {
  switch (status) {
    case "active":
      return "bg-sky-100 text-sky-950 ring-1 ring-sky-300";
    case "converted":
      return "bg-emerald-100 text-emerald-950 ring-1 ring-emerald-300";
    case "expired":
      return "bg-amber-100 text-amber-950 ring-1 ring-amber-300";
    case "cancelled":
      return "bg-zinc-100 text-zinc-800 ring-1 ring-zinc-300";
    default:
      return "bg-zinc-100 text-zinc-800 ring-1 ring-zinc-300";
  }
}
