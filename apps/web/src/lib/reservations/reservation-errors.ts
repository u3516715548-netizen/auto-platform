export const RESERVATION_ERROR_CODES = [
  "INVALID_INPUT",
  "NOT_FOUND",
  "VEHICLE_NOT_AVAILABLE",
  "NOT_ACTIVE",
  "CONFLICT",
  "FORBIDDEN",
  "INTERNAL",
] as const;

export type ReservationErrorCode = (typeof RESERVATION_ERROR_CODES)[number];

export type ReservationOk<T> = { ok: true; data: T };
export type ReservationErr = {
  ok: false;
  code: ReservationErrorCode;
  error: string;
};
export type ReservationResult<T> = ReservationOk<T> | ReservationErr;

export function reservationFail(
  code: ReservationErrorCode,
  error: string,
): ReservationErr {
  return { ok: false, code, error };
}

export function reservationOk<T>(data: T): ReservationOk<T> {
  return { ok: true, data };
}

/** Neutral RO messages — never leak another reservation's details. */
export const RESERVATION_MESSAGES = {
  invalidInput: "Date invalide pentru rezervare.",
  notFound: "Rezervarea nu există pe acest dealer.",
  vehicleNotFound: "Vehiculul nu există pe acest dealer.",
  vehicleNotAvailable: "Vehiculul nu este disponibil pentru rezervare.",
  notActive: "Rezervarea nu mai este activă.",
  conflict: "Nu am putut finaliza rezervarea. Încearcă din nou.",
  forbidden: "Rolul tău nu permite gestionarea rezervărilor.",
  internal: "Operația pe rezervare a eșuat. Încearcă din nou.",
} as const;

export function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String((error as { code?: unknown }).code) : "";
  if (code === "23505") return true;
  const message = "message" in error ? String((error as { message?: unknown }).message) : "";
  return /duplicate key|unique constraint/i.test(message);
}

export function uniqueViolationConstraint(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const constraint =
    "constraint" in error ? String((error as { constraint?: unknown }).constraint ?? "") : "";
  if (constraint) return constraint;
  const message = "message" in error ? String((error as { message?: unknown }).message) : "";
  const match = message.match(/constraint \"([^\"]+)\"/i);
  return match?.[1] ?? null;
}
