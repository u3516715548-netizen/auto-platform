import { z } from "zod";

/** Shared domain enums / schemas — aligned with Drizzle pgEnums in packages/db. */

export const tenantStatusSchema = z.enum(["active", "suspended", "trial"]);
export type TenantStatus = z.infer<typeof tenantStatusSchema>;

export const tenantPlanSchema = z.enum(["starter", "premium"]);
export type TenantPlan = z.infer<typeof tenantPlanSchema>;

export const membershipRoleSchema = z.enum(["owner", "manager", "sales", "viewer"]);
export type MembershipRole = z.infer<typeof membershipRoleSchema>;

export const vehicleStatusSchema = z.enum([
  "draft",
  "available",
  "reserved",
  "sold",
  "archived",
]);
export type VehicleStatus = z.infer<typeof vehicleStatusSchema>;

export const leadStatusSchema = z.enum([
  "new",
  "contacted",
  "qualified",
  "won",
  "lost",
  "archived",
]);
export type LeadStatus = z.infer<typeof leadStatusSchema>;

export const reservationStatusSchema = z.enum(["active", "expired", "cancelled", "converted"]);
export type ReservationStatus = z.infer<typeof reservationStatusSchema>;

export const vehicleMediaTypeSchema = z.enum(["image", "video", "document"]);
export type VehicleMediaType = z.infer<typeof vehicleMediaTypeSchema>;

export const tenantSlugSchema = z
  .string()
  .min(2)
  .max(63)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug invalid");

export const currencySchema = z.enum(["EUR", "RON", "USD"]);
export type Currency = z.infer<typeof currencySchema>;

export const auditActionSchema = z.string().min(1).max(120);
export const entityTypeSchema = z.string().min(1).max(80);

export const writeAuditLogSchema = z.object({
  tenantId: z.string().uuid(),
  actorProfileId: z.string().uuid().nullable().optional(),
  action: auditActionSchema,
  entityType: entityTypeSchema,
  entityId: z.string().uuid().nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type WriteAuditLogInput = z.infer<typeof writeAuditLogSchema>;

/** Create vehicle — never includes tenant_id (resolved server-side from Host + membership). */
export const createVehicleInputSchema = z
  .object({
    make: z.string().trim().min(1, "Marca este obligatorie").max(80),
    model: z.string().trim().min(1, "Modelul este obligatoriu").max(80),
    year: z.coerce
      .number({ invalid_type_error: "An invalid" })
      .int()
      .min(1950, "Anul este prea mic")
      .max(2100, "Anul este prea mare"),
    mileage: z.coerce
      .number({ invalid_type_error: "Kilometraj invalid" })
      .int()
      .min(0, "Kilometrajul nu poate fi negativ")
      .max(2_000_000, "Kilometraj nerealist"),
    price: z
      .string()
      .trim()
      .regex(/^\d+(?:[.,]\d{1,2})?$/, "Preț invalid")
      .transform((value) => value.replace(",", ".")),
    currency: currencySchema.default("EUR"),
    slug: z.preprocess(
      (value) => {
        if (value === undefined || value === null) return undefined;
        if (typeof value !== "string") return value;
        const trimmed = value.trim();
        return trimmed.length === 0 ? undefined : trimmed;
      },
      z
        .string()
        .max(80)
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug invalid")
        .optional(),
    ),
  })
  .strict();
export type CreateVehicleInput = z.infer<typeof createVehicleInputSchema>;

/** Update vehicle fields — never includes tenant_id. Slug required on edit. */
export const updateVehicleInputSchema = z
  .object({
    make: z.string().trim().min(1, "Marca este obligatorie").max(80),
    model: z.string().trim().min(1, "Modelul este obligatoriu").max(80),
    year: z.coerce
      .number({ invalid_type_error: "An invalid" })
      .int()
      .min(1950, "Anul este prea mic")
      .max(2100, "Anul este prea mare"),
    mileage: z.coerce
      .number({ invalid_type_error: "Kilometraj invalid" })
      .int()
      .min(0, "Kilometrajul nu poate fi negativ")
      .max(2_000_000, "Kilometraj nerealist"),
    price: z
      .string()
      .trim()
      .regex(/^\d+(?:[.,]\d{1,2})?$/, "Preț invalid")
      .transform((value) => value.replace(",", ".")),
    currency: currencySchema.default("EUR"),
    slug: z
      .string()
      .trim()
      .min(1, "Slug-ul este obligatoriu")
      .max(80)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug invalid"),
  })
  .strict();
export type UpdateVehicleInput = z.infer<typeof updateVehicleInputSchema>;

export const updateVehicleStatusSchema = z
  .object({
    status: vehicleStatusSchema,
  })
  .strict();
export type UpdateVehicleStatusInput = z.infer<typeof updateVehicleStatusSchema>;

export const vehicleIdSchema = z.string().uuid("ID vehicul invalid");

/** Public branding — only approved keys (Etapa 5). */
export const primaryColorHexSchema = z
  .string()
  .trim()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Culoare invalidă");

/** Public lead form — never includes tenant_id or vehicle_id from client trust. */
export const createPublicLeadInputSchema = z
  .object({
    name: z.string().trim().min(1, "Numele este obligatoriu").max(120),
    email: z.preprocess(
      (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
      z.string().trim().email("Email invalid").max(160).optional(),
    ),
    phone: z.preprocess(
      (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
      z.string().trim().max(40).optional(),
    ),
    message: z.preprocess(
      (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
      z.string().trim().max(2000).optional(),
    ),
  })
  .strict();
export type CreatePublicLeadInput = z.infer<typeof createPublicLeadInputSchema>;
