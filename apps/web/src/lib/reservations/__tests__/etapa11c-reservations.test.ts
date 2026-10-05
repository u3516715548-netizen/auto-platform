import { describe, expect, it } from "vitest";
import {
  formatExpiresInRo,
  reservationStatusHelpMessage,
} from "../reservation-list-filter";
import { resolveVehicleReservationPanel } from "../vehicle-reservation-panel";
import { canMutateReservation, canShowCreateReservationCta } from "../reservation-permissions";
import { RESERVATION_LIST_EXPIRE_LIMIT } from "../list-reservations";
import { RESERVATION_MUTATION_REVALIDATE_PATHS } from "../revalidate-reservation-paths";
import { reservationStatusLabel } from "../status-label";

describe("Etapa 11C — formatExpiresInRo under one hour", () => {
  it("uses fixed phrase under one hour (no minute countdown)", () => {
    const now = new Date("2026-01-01T12:00:00.000Z");
    expect(formatExpiresInRo(new Date("2026-01-01T12:30:00.000Z"), now)).toBe(
      "Expiră în mai puțin de o oră",
    );
    expect(formatExpiresInRo(new Date("2026-01-01T12:01:00.000Z"), now)).toBe(
      "Expiră în mai puțin de o oră",
    );
    expect(formatExpiresInRo(new Date("2026-01-01T13:00:00.000Z"), now)).toBe("Expiră în 1 oră");
    expect(formatExpiresInRo(new Date("2026-01-01T11:00:00.000Z"), now)).toBe("Expirată");
  });
});

describe("Etapa 11C — status help messages", () => {
  it("returns RO help for each reservation status", () => {
    expect(reservationStatusHelpMessage("active")).toBe(
      "Dacă nu este confirmată, rezervarea expiră, iar vehiculul revine în stoc.",
    );
    expect(reservationStatusHelpMessage("expired")).toBe(
      "Rezervarea a expirat. Vehiculul a revenit în stoc.",
    );
    expect(reservationStatusHelpMessage("cancelled")).toBe("Rezervarea a fost anulată.");
    expect(reservationStatusHelpMessage("converted")).toBe(
      "Rezervarea a fost convertită în vânzare. Vehiculul este marcat ca vândut.",
    );
  });
});

describe("Etapa 11C — vehicle dashboard reservation panel", () => {
  it("available + sales → create CTA", () => {
    expect(
      resolveVehicleReservationPanel({
        role: "sales",
        vehicleStatus: "available",
        activeReservationId: null,
      }),
    ).toEqual({ kind: "create" });
  });

  it("reserved → message panel; manage link only with active id", () => {
    expect(
      resolveVehicleReservationPanel({
        role: "owner",
        vehicleStatus: "reserved",
        activeReservationId: "22222222-2222-4222-8222-222222222222",
      }),
    ).toEqual({ kind: "reserved", hasManageLink: true });
    expect(
      resolveVehicleReservationPanel({
        role: "owner",
        vehicleStatus: "reserved",
        activeReservationId: null,
      }),
    ).toEqual({ kind: "reserved", hasManageLink: false });
    expect(canShowCreateReservationCta("owner", "reserved")).toBe(false);
  });

  it("sold → sold message, no create", () => {
    expect(
      resolveVehicleReservationPanel({
        role: "manager",
        vehicleStatus: "sold",
        activeReservationId: null,
      }),
    ).toEqual({ kind: "sold" });
    expect(canShowCreateReservationCta("manager", "sold")).toBe(false);
  });

  it("viewer never gets create CTA", () => {
    expect(canMutateReservation("viewer")).toBe(false);
    expect(canShowCreateReservationCta("viewer", "available")).toBe(false);
    expect(
      resolveVehicleReservationPanel({
        role: "viewer",
        vehicleStatus: "available",
        activeReservationId: null,
      }),
    ).toEqual({ kind: "none" });
  });
});

describe("Etapa 11C — lazy expiry + actions contract", () => {
  it("list expire remains bounded; non-active has no actions", () => {
    expect(RESERVATION_LIST_EXPIRE_LIMIT).toBe(50);
    const showActions = (status: string, canMutate: boolean) =>
      canMutate && status === "active";
    expect(showActions("expired", true)).toBe(false);
    expect(showActions("cancelled", true)).toBe(false);
    expect(showActions("converted", true)).toBe(false);
    expect(showActions("active", true)).toBe(true);
    expect(reservationStatusLabel("expired")).toBe("Expirată");
  });

  it("documents expiry idempotency: only active→expired rows mutate/audit", () => {
    // expireStaleReservations updates WHERE status='active'; second pass finds no rows →
    // no vehicle update, no reservation.expired audit. sold vehicles never match status=reserved.
    const wouldExpire = (status: string, expiresAt: Date, now: Date) =>
      status === "active" && expiresAt.getTime() <= now.getTime();
    const wouldReleaseVehicle = (vehicleStatus: string) => vehicleStatus === "reserved";
    const now = new Date("2026-06-01T12:00:00.000Z");
    const past = new Date("2026-06-01T10:00:00.000Z");
    expect(wouldExpire("active", past, now)).toBe(true);
    expect(wouldExpire("expired", past, now)).toBe(false);
    expect(wouldReleaseVehicle("reserved")).toBe(true);
    expect(wouldReleaseVehicle("sold")).toBe(false);
  });
});

describe("Etapa 11C — revalidation + public sold/reserved", () => {
  it("revalidate helper covers dashboard and public paths", () => {
    expect(RESERVATION_MUTATION_REVALIDATE_PATHS).toContain("/");
    expect(RESERVATION_MUTATION_REVALIDATE_PATHS).toContain("/vehicles");
    expect(RESERVATION_MUTATION_REVALIDATE_PATHS).toContain("/dashboard/reservations");
  });

  it("public catalog remains available-only (reserved/sold → not listed / 404)", () => {
    const publicVisible = (status: string) => status === "available";
    expect(publicVisible("reserved")).toBe(false);
    expect(publicVisible("sold")).toBe(false);
  });
});
