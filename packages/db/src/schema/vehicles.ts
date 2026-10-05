import {
  boolean,
  integer,
  index,
  jsonb,
  numeric,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import {
  vehicleAccidentStatusEnum,
  vehicleBodyTypeEnum,
  vehicleConditionEnum,
  vehicleDriveTypeEnum,
  vehicleEmissionEnum,
  vehicleFuelEnum,
  vehicleStatusEnum,
  vehicleTransmissionEnum,
  vehicleVatRegimeEnum,
} from "./enums";
import { tenants } from "./tenants";

/**
 * Vehicles inventory.
 *
 * Etapa 6 columns are nullable (except booleans with defaults) so existing
 * rows and drafts stay valid. Publish gate to `available` is enforced in app
 * (Zod), not via DB NOT NULL.
 *
 * VIN is staff-only — never expose in public DTO / SEO / JSON-LD / URLs.
 * `mileage` = kilometres; `price` + `currency` = EUR in Etapa 6 (app-enforced).
 * `specs` is legacy jsonb; new structured attributes use dedicated columns + `features`.
 */
export const vehicles = pgTable(
  "vehicles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    status: vehicleStatusEnum("status").notNull().default("draft"),
    slug: text("slug").notNull(),
    vin: text("vin"),
    make: text("make").notNull(),
    model: text("model").notNull(),
    year: integer("year").notNull(),
    mileage: integer("mileage").notNull().default(0),
    price: numeric("price", { precision: 12, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("EUR"),
    /** @deprecated Prefer typed columns + features; kept for backward compatibility. */
    specs: jsonb("specs").notNull().default({}),

    fuel: vehicleFuelEnum("fuel"),
    transmission: vehicleTransmissionEnum("transmission"),
    bodyType: vehicleBodyTypeEnum("body_type"),
    driveType: vehicleDriveTypeEnum("drive_type"),
    condition: vehicleConditionEnum("condition"),
    emissionStandard: vehicleEmissionEnum("emission_standard"),
    vatRegime: vehicleVatRegimeEnum("vat_regime"),
    accidentStatus: vehicleAccidentStatusEnum("accident_status"),

    powerHp: integer("power_hp"),
    engineDisplacementCc: integer("engine_displacement_cc"),
    doors: integer("doors"),
    seats: integer("seats"),
    exteriorColor: text("exterior_color"),
    interiorColor: text("interior_color"),
    firstRegistrationYear: integer("first_registration_year"),
    firstRegistrationMonth: smallint("first_registration_month"),
    priceNegotiable: boolean("price_negotiable").notNull().default(false),
    originCountry: text("origin_country"),
    locationCity: text("location_city"),
    warrantyMonths: integer("warranty_months"),
    warrantyNotes: text("warranty_notes"),
    hasServiceBook: boolean("has_service_book").notNull().default(false),
    hasServiceHistory: boolean("has_service_history").notNull().default(false),
    description: text("description"),
    /** Controlled allowlist of feature keys (string[]); validated in Zod. */
    features: jsonb("features").notNull().default([]),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("vehicles_tenant_slug_uidx").on(table.tenantId, table.slug),
    index("vehicles_tenant_id_idx").on(table.tenantId),
    index("vehicles_status_idx").on(table.status),
    index("vehicles_created_at_idx").on(table.createdAt),
    index("vehicles_vin_idx").on(table.vin),
    index("vehicles_tenant_fuel_idx").on(table.tenantId, table.fuel),
    index("vehicles_tenant_price_idx").on(table.tenantId, table.price),
    index("vehicles_tenant_year_idx").on(table.tenantId, table.year),
    index("vehicles_tenant_body_type_idx").on(table.tenantId, table.bodyType),
  ],
);
