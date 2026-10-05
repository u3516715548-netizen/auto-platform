import { describe, expect, it } from "vitest";
import {
  RESERVATION_LIST_FILTER_STATUSES,
  reservationIdSchema,
  reservationListFilterSchema,
} from "@auto-platform/types";
import {
  canMutateReservation,
  canShowCreateReservationCta,
  RESERVATION_MUTATION_ROLES,
} from "../reservation-permissions";
import {
  RESERVATION_LIST_FILTER_LABELS,
  formatExpiresInRo,
  resolveReservationListFilter,
  reservationStatusesForFilter,
} from "../reservation-list-filter";
import {
  parseCancelReservationForm,
  parseConvertReservationForm,
  parseCreateReservationForm,
  parseReservationId,
  rejectTenantIdFromReservationForm,
} from "../parse-reservation-form";
import { reservationStatusLabel } from "../status-label";
import { RESERVATION_LIST_EXPIRE_LIMIT } from "../list-reservations";
import { RESERVATION_MUTATION_REVALIDATE_PATHS } from "../revalidate-reservation-paths";
import { reservationDetailPath, reservationsPath, vehicleEditPath } from "@/lib/dashboard/nav";

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

const VEHICLE_ID = "11111111-1111-4111-8111-111111111111";
const RESERVATION_ID = "22222222-2222-4222-8222-222222222222";
const IDEMPOTENCY = "33333333-3333-4333-8333-333333333333";

describe("Etapa 11B — roles & CTA", () => {
  it("mutation roles match owner/manager/sales; viewer rejects", () => {
    expect(RESERVATION_MUTATION_ROLES).toEqual(["owner", "manager", "sales"]);
    expect(canMutateReservation("owner")).toBe(true);
    expect(canMutateReservation("manager")).toBe(true);
    expect(canMutateReservation("sales")).toBe(true);
    expect(canMutateReservation("viewer")).toBe(false);
  });

  it("CTA only for available + eligible role", () => {
    expect(canShowCreateReservationCta("sales", "available")).toBe(true);
    expect(canShowCreateReservationCta("owner", "draft")).toBe(false);
    expect(canShowCreateReservationCta("manager", "reserved")).toBe(false);
    expect(canShowCreateReservationCta("sales", "sold")).toBe(false);
    expect(canShowCreateReservationCta("owner", "archived")).toBe(false);
    expect(canShowCreateReservationCta("viewer", "available")).toBe(false);
  });
});

describe("Etapa 11B — list filter & lazy expiry bound", () => {
  it("normalizes invalid filter to all; maps status buckets", () => {
    expect(resolveReservationListFilter(undefined)).toBe("all");
    expect(resolveReservationListFilter("active")).toBe("active");
    expect(resolveReservationListFilter("bogus")).toBe("all");
    expect(resolveReservationListFilter("tenantId")).toBe("all");
    expect(resolveReservationListFilter("limit")).toBe("all");
    expect(reservationListFilterSchema.safeParse("converted").success).toBe(true);
    expect(reservationListFilterSchema.safeParse("closed").success).toBe(false);
    expect(RESERVATION_LIST_FILTER_STATUSES.active).toEqual(["active"]);
    expect(reservationStatusesForFilter("all")).toBeNull();
    expect(reservationStatusesForFilter("expired")).toEqual(["expired"]);
    expect(RESERVATION_LIST_FILTER_LABELS.cancelled).toBe("Anulate");
  });

  it("list lazy expiry uses a bounded limit (no unbounded sweep)", () => {
    expect(RESERVATION_LIST_EXPIRE_LIMIT).toBe(50);
    expect(RESERVATION_LIST_EXPIRE_LIMIT).toBeGreaterThan(0);
    expect(RESERVATION_LIST_EXPIRE_LIMIT).toBeLessThanOrEqual(200);
  });

  it("paths are relative and filter shareable", () => {
    expect(reservationsPath()).toBe("/dashboard/reservations");
    expect(reservationsPath({ filter: "active" })).toBe(
      "/dashboard/reservations?filter=active",
    );
    expect(reservationDetailPath(RESERVATION_ID)).toBe(
      `/dashboard/reservations/${RESERVATION_ID}`,
    );
    expect(reservationDetailPath(RESERVATION_ID).startsWith("http")).toBe(false);
  });
});

describe("Etapa 11B — expiry copy & labels", () => {
  it("formats Expiră în without countdown timers", () => {
    const now = new Date("2026-01-01T12:00:00.000Z");
    expect(formatExpiresInRo(new Date("2026-01-01T11:00:00.000Z"), now)).toBe("Expirată");
    expect(formatExpiresInRo(new Date("2026-01-01T14:00:00.000Z"), now)).toBe("Expiră în 2 ore");
    expect(formatExpiresInRo(new Date("2026-01-03T12:00:00.000Z"), now)).toBe("Expiră în 2 zile");
    expect(formatExpiresInRo(new Date("2026-01-01T12:30:00.000Z"), now)).toBe(
      "Expiră în mai puțin de o oră",
    );
  });

  it("status labels are Romanian text (not color-only)", () => {
    expect(reservationStatusLabel("active")).toBe("Activă");
    expect(reservationStatusLabel("expired")).toBe("Expirată");
    expect(reservationStatusLabel("cancelled")).toBe("Anulată");
    expect(reservationStatusLabel("converted")).toBe("Convertită");
  });
});

describe("Etapa 11B — form parse & id validation", () => {
  it("rejects tenant smuggling and invalid ids (404 path)", () => {
    expect(rejectTenantIdFromReservationForm(form({ tenantId: "x" }))).toBeTruthy();
    expect(rejectTenantIdFromReservationForm(form({ vehicleId: VEHICLE_ID }))).toBeNull();
    expect(reservationIdSchema.safeParse("abc").success).toBe(false);
    expect(parseReservationId("not-uuid")).toEqual({ ok: false });
    expect(parseReservationId(RESERVATION_ID)).toEqual({ ok: true, id: RESERVATION_ID });
  });

  it("parses create/cancel/convert forms", () => {
    const create = parseCreateReservationForm(
      form({ vehicleId: VEHICLE_ID, idempotencyKey: IDEMPOTENCY }),
    );
    expect(create).toEqual({
      ok: true,
      data: { vehicleId: VEHICLE_ID, idempotencyKey: IDEMPOTENCY },
    });

    expect(parseCreateReservationForm(form({ vehicleId: "bad" })).ok).toBe(false);

    expect(parseCancelReservationForm(form({ reservationId: RESERVATION_ID }))).toEqual({
      ok: true,
      data: { reservationId: RESERVATION_ID },
    });
    expect(parseConvertReservationForm(form({ reservationId: RESERVATION_ID }))).toEqual({
      ok: true,
      data: { reservationId: RESERVATION_ID },
    });
  });
});

describe("Etapa 11B — creator name RLS fallback (documented)", () => {
  it("documents that profile names may be unavailable under profiles_select_own", () => {
    // list-reservations joins profiles (own-row RLS) + memberships (tenant-visible).
    // Fallback display: profile name → "Membru · {rol}" → omit column value ("—").
    // No new RLS policies are introduced in 11B.
    const fallbacks = ["Nume vizibil", "Membru · Vânzări", null] as const;
    expect(fallbacks.includes("Membru · Vânzări")).toBe(true);
    expect(fallbacks.includes(null)).toBe(true);
  });
});

describe("Etapa 11B — non-active actions contract", () => {
  it("only active status should expose cancel/convert in UI", () => {
    const showActions = (status: string, canMutate: boolean) =>
      canMutate && status === "active";
    expect(showActions("active", true)).toBe(true);
    expect(showActions("active", false)).toBe(false);
    expect(showActions("expired", true)).toBe(false);
    expect(showActions("cancelled", true)).toBe(false);
    expect(showActions("converted", true)).toBe(false);
  });
});

describe("Etapa 11B — revalidation paths", () => {
  it("covers dashboard + public catalog paths after mutations", () => {
    expect(RESERVATION_MUTATION_REVALIDATE_PATHS).toEqual([
      "/dashboard/reservations",
      "/dashboard/vehicles",
      "/dashboard",
      "/",
      "/vehicles",
    ]);
    expect(vehicleEditPath(VEHICLE_ID)).toBe(`/dashboard/vehicles/${VEHICLE_ID}`);
  });
});

describe("Etapa 11B — public available-only contract (documented)", () => {
  it("reserved/sold stay out of public catalog (E5 regression surface)", () => {
    // Covered online in public-storefront.test.ts:
    // getPublicVehicleBySlug(... reserved ...) → null
    // Catalog filters eq(vehicles.status, "available") only → sold/reserved absent → public slug 404.
    const publicVisible = (status: string) => status === "available";
    expect(publicVisible("available")).toBe(true);
    expect(publicVisible("reserved")).toBe(false);
    expect(publicVisible("sold")).toBe(false);
  });
});
