import type { VehicleStatus } from "@auto-platform/types";

const STATUS_LABELS: Record<VehicleStatus, string> = {
  draft: "Ciornă",
  available: "Disponibil",
  reserved: "Rezervat",
  sold: "Vândut",
  archived: "Arhivat",
};

export function vehicleStatusLabel(status: VehicleStatus): string {
  return STATUS_LABELS[status] ?? status;
}
