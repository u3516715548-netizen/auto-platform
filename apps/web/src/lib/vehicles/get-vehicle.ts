import { and, eq } from "drizzle-orm";
import { assertTenantAccess } from "@auto-platform/core";
import { getDb, vehicles, withTenantContext } from "@auto-platform/db";
import {
  vehicleIdSchema,
  type VehicleAccidentStatus,
  type VehicleBodyType,
  type VehicleCondition,
  type VehicleDriveType,
  type VehicleEmission,
  type VehicleFeatureKey,
  type VehicleFuel,
  type VehicleTransmission,
  type VehicleVatRegime,
} from "@auto-platform/types";
import { requireMembership, type MembershipSession } from "@/lib/auth/require-membership";

export type TenantVehicle = {
  id: string;
  slug: string;
  make: string;
  model: string;
  year: number;
  mileage: number;
  price: string;
  currency: string;
  status: "draft" | "available" | "reserved" | "sold" | "archived";
  vin: string | null;
  fuel: VehicleFuel | null;
  transmission: VehicleTransmission | null;
  bodyType: VehicleBodyType | null;
  driveType: VehicleDriveType | null;
  condition: VehicleCondition | null;
  emissionStandard: VehicleEmission | null;
  vatRegime: VehicleVatRegime | null;
  accidentStatus: VehicleAccidentStatus | null;
  powerHp: number | null;
  engineDisplacementCc: number | null;
  doors: number | null;
  seats: number | null;
  exteriorColor: string | null;
  interiorColor: string | null;
  firstRegistrationYear: number | null;
  firstRegistrationMonth: number | null;
  priceNegotiable: boolean;
  originCountry: string | null;
  locationCity: string | null;
  warrantyMonths: number | null;
  warrantyNotes: string | null;
  hasServiceBook: boolean;
  hasServiceHistory: boolean;
  description: string | null;
  features: VehicleFeatureKey[];
  createdAt: Date;
  updatedAt: Date;
};

export type TenantVehicleAccess = {
  session: MembershipSession;
  vehicle: TenantVehicle;
};

function parseFeatures(raw: unknown): VehicleFeatureKey[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is VehicleFeatureKey => typeof item === "string");
}

/**
 * Loads a vehicle that belongs to the Host-resolved tenant only.
 * Returns null when id is invalid, missing, or cross-tenant.
 * Includes staff-only fields (VIN) for dashboard edit — never send this object to public DTO.
 */
export async function getTenantVehicleById(rawId: string): Promise<TenantVehicleAccess | null> {
  const idParsed = vehicleIdSchema.safeParse(rawId);
  if (!idParsed.success) {
    return null;
  }
  const vehicleId = idParsed.data;
  const session = await requireMembership();
  const tenantId = session.tenant.tenantId;
  const profileId = session.user.profile.id;

  const row = await withTenantContext(getDb(), { profileId, tenantId }, async (db) => {
    return db.query.vehicles.findFirst({
      where: and(eq(vehicles.id, vehicleId), eq(vehicles.tenantId, tenantId)),
    });
  });

  if (!row) {
    return null;
  }

  assertTenantAccess(tenantId, row.tenantId);

  return {
    session,
    vehicle: {
      id: row.id,
      slug: row.slug,
      make: row.make,
      model: row.model,
      year: row.year,
      mileage: row.mileage,
      price: row.price,
      currency: row.currency,
      status: row.status,
      vin: row.vin,
      fuel: row.fuel,
      transmission: row.transmission,
      bodyType: row.bodyType,
      driveType: row.driveType,
      condition: row.condition,
      emissionStandard: row.emissionStandard,
      vatRegime: row.vatRegime,
      accidentStatus: row.accidentStatus,
      powerHp: row.powerHp,
      engineDisplacementCc: row.engineDisplacementCc,
      doors: row.doors,
      seats: row.seats,
      exteriorColor: row.exteriorColor,
      interiorColor: row.interiorColor,
      firstRegistrationYear: row.firstRegistrationYear,
      firstRegistrationMonth: row.firstRegistrationMonth,
      priceNegotiable: row.priceNegotiable,
      originCountry: row.originCountry,
      locationCity: row.locationCity,
      warrantyMonths: row.warrantyMonths,
      warrantyNotes: row.warrantyNotes,
      hasServiceBook: row.hasServiceBook,
      hasServiceHistory: row.hasServiceHistory,
      description: row.description,
      features: parseFeatures(row.features),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    },
  };
}
