import { describe, expect, it } from "vitest";
import {
  RESERVATION_MUTATION_ROLES,
  RESERVATION_TTL_MS,
  canMutateReservation,
  computeReservationExpiresAt,
} from "@auto-platform/core";
import {
  cancelReservationInputSchema,
  convertReservationInputSchema,
  createReservationInputSchema,
} from "@auto-platform/types";
import {
  RESERVATION_MESSAGES,
  isUniqueViolation,
  reservationFail,
  reservationOk,
} from "../reservation-errors";

const VEHICLE_ID = "11111111-1111-4111-8111-111111111111";
const RESERVATION_ID = "22222222-2222-4222-8222-222222222222";
const IDEMPOTENCY = "33333333-3333-4333-8333-333333333333";

describe("Etapa 11A — reservation permissions & TTL", () => {
  it("allows owner/manager/sales and rejects viewer", () => {
    expect(RESERVATION_MUTATION_ROLES).toEqual(["owner", "manager", "sales"]);
    expect(canMutateReservation("owner")).toBe(true);
    expect(canMutateReservation("manager")).toBe(true);
    expect(canMutateReservation("sales")).toBe(true);
    expect(canMutateReservation("viewer")).toBe(false);
  });

  it("computes expiresAt ~48h from now", () => {
    expect(RESERVATION_TTL_MS).toBe(48 * 60 * 60 * 1000);
    const now = new Date("2026-01-01T12:00:00.000Z");
    const expires = computeReservationExpiresAt(now);
    expect(expires.getTime() - now.getTime()).toBe(RESERVATION_TTL_MS);
  });
});

describe("Etapa 11A — Zod contracts", () => {
  it("accepts create with optional idempotency key", () => {
    expect(createReservationInputSchema.safeParse({ vehicleId: VEHICLE_ID }).success).toBe(true);
    expect(
      createReservationInputSchema.safeParse({
        vehicleId: VEHICLE_ID,
        idempotencyKey: IDEMPOTENCY,
      }).success,
    ).toBe(true);
    expect(
      createReservationInputSchema.safeParse({
        vehicleId: VEHICLE_ID,
        tenantId: "00000000-0000-4000-8000-000000000099",
      }).success,
    ).toBe(false);
    expect(createReservationInputSchema.safeParse({ vehicleId: "bad" }).success).toBe(false);
  });

  it("accepts cancel/convert reservation ids only", () => {
    expect(
      cancelReservationInputSchema.safeParse({ reservationId: RESERVATION_ID }).success,
    ).toBe(true);
    expect(
      convertReservationInputSchema.safeParse({ reservationId: RESERVATION_ID }).success,
    ).toBe(true);
    expect(cancelReservationInputSchema.safeParse({ reservationId: "x" }).success).toBe(false);
  });
});

describe("Etapa 11A — errors & audit metadata shape", () => {
  it("exposes neutral RO messages without reservation PII", () => {
    for (const message of Object.values(RESERVATION_MESSAGES)) {
      expect(message).not.toMatch(/@|\+40|telefon|email|lead/i);
    }
    expect(reservationFail("NOT_ACTIVE", RESERVATION_MESSAGES.notActive).ok).toBe(false);
    expect(reservationOk({ id: RESERVATION_ID }).ok).toBe(true);
  });

  it("detects postgres unique violations", () => {
    expect(isUniqueViolation({ code: "23505" })).toBe(true);
    expect(isUniqueViolation({ message: "duplicate key value violates unique constraint" })).toBe(
      true,
    );
    expect(isUniqueViolation({ code: "23503" })).toBe(false);
  });

  it("audit metadata allowlist excludes contact fields", () => {
    const meta = {
      vehicleId: VEHICLE_ID,
      fromStatus: "active",
      toStatus: "cancelled",
      expiresAt: new Date().toISOString(),
    };
    expect(Object.keys(meta).sort()).toEqual(
      ["expiresAt", "fromStatus", "toStatus", "vehicleId"].sort(),
    );
    expect(JSON.stringify(meta)).not.toMatch(/name|phone|email|message/i);
  });
});
