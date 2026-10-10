import { z } from "zod";

/** Shared domain enums / schemas — aligned with Drizzle pgEnums in packages/db. */

export const tenantStatusSchema = z.enum(["active", "suspended", "trial"]);
export type TenantStatus = z.infer<typeof tenantStatusSchema>;

export const tenantPlanSchema = z.enum(["starter", "premium"]);
export type TenantPlan = z.infer<typeof tenantPlanSchema>;

export const membershipRoleSchema = z.enum(["owner", "manager", "sales", "viewer"]);
export type MembershipRole = z.infer<typeof membershipRoleSchema>;

/** Roles that may be assigned via invitation (never owner). */
export const INVITABLE_MEMBERSHIP_ROLES = ["manager", "sales", "viewer"] as const;
export type InvitableMembershipRole = (typeof INVITABLE_MEMBERSHIP_ROLES)[number];
export const invitableMembershipRoleSchema = z.enum(INVITABLE_MEMBERSHIP_ROLES);

export const tenantInvitationStatusSchema = z.enum([
  "pending",
  "accepted",
  "expired",
  "revoked",
]);
export type TenantInvitationStatus = z.infer<typeof tenantInvitationStatusSchema>;

export const INVITE_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function normalizeInvitationEmail(raw: string): string | null {
  const normalized = raw.trim().toLowerCase();
  if (!normalized || normalized.length > 160) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return null;
  return normalized;
}

export const createTenantInvitationInputSchema = z
  .object({
    email: z
      .string()
      .trim()
      .min(1, "Emailul este obligatoriu")
      .max(160)
      .transform((value, ctx) => {
        const normalized = normalizeInvitationEmail(value);
        if (!normalized) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Email invalid" });
          return z.NEVER;
        }
        return normalized;
      }),
    role: invitableMembershipRoleSchema,
  })
  .strict();
export type CreateTenantInvitationInput = z.infer<typeof createTenantInvitationInputSchema>;

export const changeMemberRoleInputSchema = z
  .object({
    membershipId: z.string().uuid("Membership invalid"),
    role: invitableMembershipRoleSchema,
  })
  .strict();
export type ChangeMemberRoleInput = z.infer<typeof changeMemberRoleInputSchema>;

export const removeMemberInputSchema = z
  .object({
    membershipId: z.string().uuid("Membership invalid"),
  })
  .strict();
export type RemoveMemberInput = z.infer<typeof removeMemberInputSchema>;

export const invitationIdInputSchema = z
  .object({
    invitationId: z.string().uuid("Invitație invalidă"),
  })
  .strict();

export const vehicleStatusSchema = z.enum([
  "draft",
  "available",
  "reserved",
  "sold",
  "archived",
]);
export type VehicleStatus = z.infer<typeof vehicleStatusSchema>;

/** Etapa 6 — vehicle attribute enums (DB EN keys; UI labels RO separately). */
export const vehicleFuelSchema = z.enum([
  "petrol",
  "diesel",
  "hybrid",
  "plugin_hybrid",
  "electric",
  "lpg",
  "cng",
  "other",
]);
export type VehicleFuel = z.infer<typeof vehicleFuelSchema>;

export const vehicleTransmissionSchema = z.enum([
  "manual",
  "automatic",
  "dct",
  "cvt",
  "other",
]);
export type VehicleTransmission = z.infer<typeof vehicleTransmissionSchema>;

export const vehicleBodyTypeSchema = z.enum([
  "hatchback",
  "sedan",
  "estate",
  "suv",
  "coupe",
  "convertible",
  "mpv",
  "van",
  "pickup",
  "other",
]);
export type VehicleBodyType = z.infer<typeof vehicleBodyTypeSchema>;

export const vehicleDriveTypeSchema = z.enum(["fwd", "rwd", "awd", "4wd"]);
export type VehicleDriveType = z.infer<typeof vehicleDriveTypeSchema>;

export const vehicleConditionSchema = z.enum(["new", "used", "demo"]);
export type VehicleCondition = z.infer<typeof vehicleConditionSchema>;

export const vehicleEmissionSchema = z.enum([
  "euro_3",
  "euro_4",
  "euro_5",
  "euro_6",
  "euro_6d",
  "euro_6e",
  "ev",
  "other",
]);
export type VehicleEmission = z.infer<typeof vehicleEmissionSchema>;

export const vehicleVatRegimeSchema = z.enum([
  "deductible",
  "included",
  "not_applicable",
]);
export type VehicleVatRegime = z.infer<typeof vehicleVatRegimeSchema>;

export const vehicleAccidentStatusSchema = z.enum([
  "none",
  "cosmetic",
  "minor",
  "major",
  "unknown",
]);
export type VehicleAccidentStatus = z.infer<typeof vehicleAccidentStatusSchema>;

/** Controlled feature allowlist (Etapa 6). Unknown keys rejected by Zod. */
export const VEHICLE_FEATURE_KEYS = [
  "abs",
  "esp",
  "airbag",
  "ac",
  "climate_auto",
  "leather",
  "nav",
  "parking_sensors",
  "parking_camera",
  "cruise",
  "adaptive_cruise",
  "led_lights",
  "xenon",
  "sunroof",
  "tow_hitch",
  "keyless",
  "heated_seats",
  "android_auto",
  "carplay",
] as const;
export type VehicleFeatureKey = (typeof VEHICLE_FEATURE_KEYS)[number];

export const vehicleFeatureKeySchema = z.enum(VEHICLE_FEATURE_KEYS);
export const vehicleFeaturesSchema = z.array(vehicleFeatureKeySchema).max(64);

/** Romanian UI labels for feature keys (storefront/dashboard). */
export const VEHICLE_FEATURE_LABELS_RO: Record<VehicleFeatureKey, string> = {
  abs: "ABS",
  esp: "ESP",
  airbag: "Airbag-uri",
  ac: "Aer condiționat",
  climate_auto: "Climatizare automată",
  leather: "Interior piele",
  nav: "Navigație",
  parking_sensors: "Senzori parcare",
  parking_camera: "Cameră parcare",
  cruise: "Tempomat",
  adaptive_cruise: "Tempomat adaptiv",
  led_lights: "Faruri LED",
  xenon: "Faruri Xenon",
  sunroof: "Trapă",
  tow_hitch: "Cârlig remorcare",
  keyless: "Keyless",
  heated_seats: "Scaune încălzite",
  android_auto: "Android Auto",
  carplay: "Apple CarPlay",
};

export const leadStatusSchema = z.enum([
  "new",
  "contacted",
  "qualified",
  "won",
  "lost",
  "archived",
]);
export type LeadStatus = z.infer<typeof leadStatusSchema>;

export const leadIdSchema = z.string().uuid("ID lead invalid");

/** Dashboard list filter buckets (maps onto existing lead_status enum). */
export const leadListFilterSchema = z.enum(["all", "new", "in_progress", "closed"]);
export type LeadListFilter = z.infer<typeof leadListFilterSchema>;

export const LEAD_LIST_FILTER_STATUSES: Record<LeadListFilter, readonly LeadStatus[] | null> = {
  all: null,
  new: ["new"],
  in_progress: ["contacted", "qualified"],
  closed: ["won", "lost", "archived"],
};

export const updateLeadStatusSchema = z
  .object({
    leadId: leadIdSchema,
    status: leadStatusSchema,
  })
  .strict();
export type UpdateLeadStatusInput = z.infer<typeof updateLeadStatusSchema>;

/** `assignedTo: null` clears assignment; UUID must be revalidated as tenant membership. */
export const assignLeadSchema = z
  .object({
    leadId: leadIdSchema,
    assignedTo: z.union([z.string().uuid("Membru invalid"), z.null()]),
  })
  .strict();
export type AssignLeadInput = z.infer<typeof assignLeadSchema>;

export const reservationStatusSchema = z.enum(["active", "expired", "cancelled", "converted"]);
export type ReservationStatus = z.infer<typeof reservationStatusSchema>;

/** Dashboard reservation list filter (exact reservation_status values + all). */
export const reservationListFilterSchema = z.enum([
  "all",
  "active",
  "expired",
  "cancelled",
  "converted",
]);
export type ReservationListFilter = z.infer<typeof reservationListFilterSchema>;

export const RESERVATION_LIST_FILTER_STATUSES: Record<
  ReservationListFilter,
  readonly ReservationStatus[] | null
> = {
  all: null,
  active: ["active"],
  expired: ["expired"],
  cancelled: ["cancelled"],
  converted: ["converted"],
};

export const vehicleMediaTypeSchema = z.enum(["image", "video", "document"]);
export type VehicleMediaType = z.infer<typeof vehicleMediaTypeSchema>;

export const tenantSlugSchema = z
  .string()
  .min(2)
  .max(63)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug invalid");

/** Kept for future tenant currency settings; vehicle forms use EUR-only in Etapa 6. */
export const currencySchema = z.enum(["EUR", "RON", "USD"]);
export type Currency = z.infer<typeof currencySchema>;

/** Etapa 6 vehicle money — EUR only (no selector / conversion). */
export const vehicleCurrencySchema = z.literal("EUR");

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

const priceEurStringSchema = z
  .string()
  .trim()
  .regex(/^\d+(?:[.,]\d{1,2})?$/, "Preț invalid")
  .transform((value) => value.replace(",", "."));

const mileageKmSchema = z.coerce
  .number({ invalid_type_error: "Kilometraj invalid" })
  .int()
  .min(0, "Kilometrajul nu poate fi negativ")
  .max(2_000_000, "Kilometraj nerealist");

const yearSchema = z.coerce
  .number({ invalid_type_error: "An invalid" })
  .int()
  .min(1950, "Anul este prea mic")
  .max(2100, "Anul este prea mare");

/** Free-text colour: normalized, no HTML/script. */
export const vehicleColorTextSchema = z
  .string()
  .trim()
  .min(1, "Culoarea este obligatorie")
  .max(60, "Culoarea este prea lungă")
  .refine((value) => !/[<>]|javascript:|on\w+=/i.test(value), {
    message: "Culoarea conține caractere nepermise",
  });

export const vehicleDescriptionSchema = z
  .string()
  .trim()
  .min(20, "Descrierea trebuie să aibă cel puțin 20 de caractere")
  .max(5000, "Descrierea este prea lungă")
  .refine((value) => !/<[^>]*>/.test(value), {
    message: "Descrierea nu poate conține HTML",
  });

/** Create vehicle — short draft flow. Never includes tenant_id. Currency forced EUR. */
export const createVehicleInputSchema = z
  .object({
    make: z.string().trim().min(1, "Marca este obligatorie").max(80),
    model: z.string().trim().min(1, "Modelul este obligatoriu").max(80),
    year: yearSchema,
    mileage: mileageKmSchema,
    price: priceEurStringSchema,
    /** Ignored from client; server persists EUR only. */
    currency: vehicleCurrencySchema.default("EUR"),
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

/**
 * Fields required before status can become `available` (Etapa 6).
 * Validated in app on status transition — not DB NOT NULL.
 */
export const vehiclePublishRequiredSchema = z
  .object({
    make: z.string().trim().min(1),
    model: z.string().trim().min(1),
    year: yearSchema,
    mileage: mileageKmSchema,
    price: priceEurStringSchema,
    fuel: vehicleFuelSchema,
    transmission: vehicleTransmissionSchema,
    bodyType: vehicleBodyTypeSchema,
    condition: vehicleConditionSchema,
    powerHp: z.coerce
      .number({ invalid_type_error: "Puterea este invalidă" })
      .int()
      .min(1, "Puterea trebuie să fie pozitivă")
      .max(2000, "Putere nerealistă"),
    description: vehicleDescriptionSchema,
    vatRegime: vehicleVatRegimeSchema,
  })
  .strict();
export type VehiclePublishRequired = z.infer<typeof vehiclePublishRequiredSchema>;

export const VEHICLE_PUBLISH_REQUIRED_KEYS = [
  "make",
  "model",
  "year",
  "mileage",
  "price",
  "fuel",
  "transmission",
  "bodyType",
  "condition",
  "powerHp",
  "description",
  "vatRegime",
] as const;

export const VEHICLE_PUBLISH_REQUIRED_LABELS_RO: Record<
  (typeof VEHICLE_PUBLISH_REQUIRED_KEYS)[number],
  string
> = {
  make: "Marcă",
  model: "Model",
  year: "An model",
  mileage: "Kilometraj",
  price: "Preț",
  fuel: "Combustibil",
  transmission: "Transmisie",
  bodyType: "Caroserie",
  condition: "Stare",
  powerHp: "Putere (CP)",
  description: "Descriere",
  vatRegime: "Regim TVA",
};

export type PublishReadiness =
  | { ok: true }
  | { ok: false; missingLabels: string[] };

/** Assess whether a vehicle row/payload may transition to `available`. */
export function assessVehiclePublishReady(data: unknown): PublishReadiness {
  const parsed = vehiclePublishRequiredSchema.safeParse(data);
  if (parsed.success) return { ok: true };

  const missing = new Set<string>();
  for (const issue of parsed.error.issues) {
    const key = issue.path[0];
    if (
      typeof key === "string" &&
      Object.prototype.hasOwnProperty.call(VEHICLE_PUBLISH_REQUIRED_LABELS_RO, key)
    ) {
      missing.add(
        VEHICLE_PUBLISH_REQUIRED_LABELS_RO[
          key as (typeof VEHICLE_PUBLISH_REQUIRED_KEYS)[number]
        ],
      );
    }
  }
  return {
    ok: false,
    missingLabels: [...missing],
  };
}

const emptyToUndefined = (value: unknown) => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string" && value.trim() === "") return undefined;
  return value;
};

const optionalEnum = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(emptyToUndefined, schema.optional());

const optionalColorSchema = z.preprocess(
  emptyToUndefined,
  vehicleColorTextSchema.optional(),
);

const optionalDescriptionSchema = z.preprocess(emptyToUndefined, vehicleDescriptionSchema.optional());

const optionalVinSchema = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .trim()
    .min(5, "VIN prea scurt")
    .max(32, "VIN prea lung")
    .regex(/^[A-HJ-NPR-Z0-9]+$/i, "VIN invalid")
    .optional(),
);

const optionalInt = (min: number, max: number, message: string) =>
  z.preprocess(
    emptyToUndefined,
    z.coerce
      .number({ invalid_type_error: message })
      .int()
      .min(min, message)
      .max(max, message)
      .optional(),
  );

/** Full edit payload (Etapa 6B). Never includes tenant_id. Currency forced EUR. */
export const updateVehicleInputSchema = z
  .object({
    make: z.string().trim().min(1, "Marca este obligatorie").max(80),
    model: z.string().trim().min(1, "Modelul este obligatoriu").max(80),
    year: yearSchema,
    mileage: mileageKmSchema,
    price: priceEurStringSchema,
    currency: vehicleCurrencySchema.default("EUR"),
    slug: z
      .string()
      .trim()
      .min(1, "Slug-ul este obligatoriu")
      .max(80)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug invalid"),
    vin: optionalVinSchema,
    fuel: optionalEnum(vehicleFuelSchema),
    transmission: optionalEnum(vehicleTransmissionSchema),
    bodyType: optionalEnum(vehicleBodyTypeSchema),
    driveType: optionalEnum(vehicleDriveTypeSchema),
    condition: optionalEnum(vehicleConditionSchema),
    emissionStandard: optionalEnum(vehicleEmissionSchema),
    vatRegime: optionalEnum(vehicleVatRegimeSchema),
    accidentStatus: optionalEnum(vehicleAccidentStatusSchema),
    powerHp: optionalInt(1, 2000, "Putere invalidă"),
    engineDisplacementCc: optionalInt(1, 10000, "Cilindree invalidă"),
    doors: optionalInt(1, 10, "Număr de uși invalid"),
    seats: optionalInt(1, 20, "Număr de locuri invalid"),
    exteriorColor: optionalColorSchema,
    interiorColor: optionalColorSchema,
    firstRegistrationYear: optionalInt(1950, 2100, "An prima înmatriculare invalid"),
    firstRegistrationMonth: optionalInt(1, 12, "Luna primei înmatriculări este invalidă"),
    priceNegotiable: z.boolean().default(false),
    originCountry: z.preprocess(
      emptyToUndefined,
      z
        .string()
        .trim()
        .length(2, "Țara trebuie să fie cod ISO pe 2 litere")
        .regex(/^[A-Za-z]{2}$/, "Țara trebuie să fie cod ISO pe 2 litere")
        .transform((value) => value.toUpperCase())
        .optional(),
    ),
    locationCity: z.preprocess(
      emptyToUndefined,
      z
        .string()
        .trim()
        .min(1)
        .max(80)
        .refine((value) => !/[<>]/.test(value), { message: "Oraș invalid" })
        .optional(),
    ),
    warrantyMonths: optionalInt(0, 120, "Garanție (luni) invalidă"),
    warrantyNotes: z.preprocess(
      emptyToUndefined,
      z
        .string()
        .trim()
        .max(500, "Notele de garanție sunt prea lungi")
        .refine((value) => !/<[^>]*>/.test(value), {
          message: "Notele de garanție nu pot conține HTML",
        })
        .optional(),
    ),
    hasServiceBook: z.boolean().default(false),
    hasServiceHistory: z.boolean().default(false),
    description: optionalDescriptionSchema,
    features: vehicleFeaturesSchema.default([]),
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

export const reservationIdSchema = z.string().uuid("ID rezervare invalid");

/** Optional client retry key — UUID only; server generates when absent. */
export const reservationIdempotencyKeySchema = z
  .string()
  .uuid("Cheie de idempotency invalidă");

export const createReservationInputSchema = z
  .object({
    vehicleId: vehicleIdSchema,
    idempotencyKey: reservationIdempotencyKeySchema.optional(),
  })
  .strict();
export type CreateReservationInput = z.infer<typeof createReservationInputSchema>;

export const cancelReservationInputSchema = z
  .object({
    reservationId: reservationIdSchema,
  })
  .strict();
export type CancelReservationInput = z.infer<typeof cancelReservationInputSchema>;

export const convertReservationInputSchema = z
  .object({
    reservationId: reservationIdSchema,
  })
  .strict();
export type ConvertReservationInput = z.infer<typeof convertReservationInputSchema>;

/** Etapa 7 — vehicle image media (v1: images only). */
export const VEHICLE_MEDIA_MAX_IMAGES = 20;
export const VEHICLE_MEDIA_MAX_BYTES = 5 * 1024 * 1024;
export const VEHICLE_MEDIA_SIGNED_URL_TTL_SEC = 3600;

export const vehicleImageMimeSchema = z.enum([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
export type VehicleImageMime = z.infer<typeof vehicleImageMimeSchema>;

export const vehicleMediaIdSchema = z.string().uuid("ID media invalid");

export const vehicleMediaAltTextSchema = z
  .string()
  .trim()
  .max(160, "Text alternativ prea lung")
  .refine((value) => !/<[^>]*>/.test(value), {
    message: "Text alternativ invalid",
  });

export const requestVehicleMediaUploadSchema = z
  .object({
    vehicleId: vehicleIdSchema,
    contentType: vehicleImageMimeSchema,
    byteSize: z
      .number()
      .int()
      .min(1, "Fișier gol")
      .max(VEHICLE_MEDIA_MAX_BYTES, "Fișierul depășește 5 MB"),
  })
  .strict();
export type RequestVehicleMediaUploadInput = z.infer<typeof requestVehicleMediaUploadSchema>;

export const confirmVehicleMediaUploadSchema = z
  .object({
    vehicleId: vehicleIdSchema,
    mediaId: vehicleMediaIdSchema,
    altText: z.preprocess(
      (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
      vehicleMediaAltTextSchema.optional(),
    ),
  })
  .strict();
export type ConfirmVehicleMediaUploadInput = z.infer<typeof confirmVehicleMediaUploadSchema>;

export const reorderVehicleMediaSchema = z
  .object({
    vehicleId: vehicleIdSchema,
    orderedMediaIds: z
      .array(vehicleMediaIdSchema)
      .min(1, "Ordinea imaginilor este invalidă")
      .max(VEHICLE_MEDIA_MAX_IMAGES),
  })
  .strict();
export type ReorderVehicleMediaInput = z.infer<typeof reorderVehicleMediaSchema>;

export const deleteVehicleMediaSchema = z
  .object({
    vehicleId: vehicleIdSchema,
    mediaId: vehicleMediaIdSchema,
  })
  .strict();
export type DeleteVehicleMediaInput = z.infer<typeof deleteVehicleMediaSchema>;

export const updateVehicleMediaAltTextSchema = z
  .object({
    vehicleId: vehicleIdSchema,
    mediaId: vehicleMediaIdSchema,
    altText: z.preprocess(
      (value) => (typeof value === "string" && value.trim() === "" ? null : value),
      vehicleMediaAltTextSchema.nullable(),
    ),
  })
  .strict();
export type UpdateVehicleMediaAltTextInput = z.infer<typeof updateVehicleMediaAltTextSchema>;

/** Public branding — only approved keys (Etapa 5 / Etapa 9A). */
export const primaryColorHexSchema = z
  .string()
  .trim()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Culoare invalidă");

/** Template 1 fallback accent when branding.primaryColor is missing/invalid. */
export const TEMPLATE_1_FALLBACK_PRIMARY_COLOR = "#2563eb" as const;

/** Selectable storefront template IDs (update allowlist). Future IDs stay out until ready. */
export const STOREFRONT_TEMPLATE_IDS = ["template-1", "template-2"] as const;
export type StorefrontTemplateId = (typeof STOREFRONT_TEMPLATE_IDS)[number];
export const DEFAULT_STOREFRONT_TEMPLATE_ID = "template-1" as const satisfies StorefrontTemplateId;

export const storefrontTemplateIdSchema = z.enum(STOREFRONT_TEMPLATE_IDS);

const PUBLIC_CONTACT_INPUT_MAX = 40;

/**
 * Normalizes RO / E.164-ish contact numbers to `+` E.164 form.
 * Rejects URLs (WhatsApp must be a number, not a wa.me link).
 * Returns null when invalid.
 */
export function normalizePublicContactNumber(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > PUBLIC_CONTACT_INPUT_MAX) return null;
  if (/https?:\/\//i.test(trimmed) || /wa\.me\//i.test(trimmed) || /[a-zA-Z]/.test(trimmed)) {
    return null;
  }

  let digits = trimmed.replace(/[^\d+]/g, "");
  if (!digits) return null;
  if ((digits.match(/\+/g) ?? []).length > 1) return null;
  if (digits.includes("+") && !digits.startsWith("+")) return null;

  if (digits.startsWith("00")) {
    digits = `+${digits.slice(2)}`;
  }

  // Romanian national mobile: 07xxxxxxxx → +407xxxxxxxx
  if (/^07\d{8}$/.test(digits)) {
    digits = `+40${digits.slice(1)}`;
  } else if (/^407\d{8}$/.test(digits)) {
    digits = `+${digits}`;
  }

  // E.164: + and 8–15 digits total country+national
  if (!/^\+[1-9]\d{7,14}$/.test(digits)) return null;
  return digits;
}

function contactNumberSchema(label: string) {
  return z
    .string()
    .trim()
    .min(1, `${label} este obligatoriu`)
    .max(PUBLIC_CONTACT_INPUT_MAX, `${label} este prea lung`)
    .transform((value, ctx) => {
      const normalized = normalizePublicContactNumber(value);
      if (!normalized) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label} invalid` });
        return z.NEVER;
      }
      return normalized;
    });
}

export const publicPhoneSchema = contactNumberSchema("Telefon");
export const publicWhatsappSchema = contactNumberSchema("WhatsApp");

/**
 * Strict branding write contract (dashboard 9C / 10C). Unknown keys are rejected.
 * `phone` / `whatsapp` use null to clear.
 * `leadNotificationEmails` is staff-only (never in PublicTenantView).
 */
export const leadNotificationEmailAddressSchema = z
  .string()
  .trim()
  .email("Email notificare invalid")
  .max(160, "Email notificare prea lung")
  .transform((value) => value.toLowerCase());

/**
 * Max 3 notification emails: trim, lowercase, dedupe, empty allowed.
 * Input should be an array of strings (not a CSV blob).
 */
export const leadNotificationEmailsSchema = z.preprocess((value) => {
  if (!Array.isArray(value)) return value;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const normalized = item.trim().toLowerCase();
    if (!normalized) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}, z.array(z.string().email("Email notificare invalid").max(160)).max(3, "Maximum 3 adrese de notificare"));

export type LeadNotificationEmails = z.infer<typeof leadNotificationEmailsSchema>;

export const tenantBrandingUpdateSchema = z
  .object({
    primaryColor: primaryColorHexSchema,
    templateId: storefrontTemplateIdSchema,
    phone: z.union([publicPhoneSchema, z.null()]),
    whatsapp: z.union([publicWhatsappSchema, z.null()]),
    leadNotificationEmails: leadNotificationEmailsSchema,
  })
  .strict();
export type TenantBrandingUpdateInput = z.infer<typeof tenantBrandingUpdateSchema>;

const emptyFormFieldToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

/** Required lead email — trim, lowercase, max 160 (Etapa 17). */
export const publicLeadEmailFieldSchema = z.preprocess(
  emptyFormFieldToUndefined,
  z
    .string({ required_error: "Emailul este obligatoriu" })
    .trim()
    .min(1, "Emailul este obligatoriu")
    .email("Email invalid")
    .max(160, "Email prea lung")
    .transform((value) => value.toLowerCase()),
);

/** Optional lead phone — same normalization rules as public dealer contact numbers. */
export const publicLeadPhoneFieldSchema = z.preprocess(
  emptyFormFieldToUndefined,
  z
    .string()
    .trim()
    .max(PUBLIC_CONTACT_INPUT_MAX, "Telefon prea lung")
    .optional()
    .transform((value, ctx) => {
      if (value === undefined) return undefined;
      const normalized = normalizePublicContactNumber(value);
      if (!normalized) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Telefon invalid" });
        return z.NEVER;
      }
      return normalized;
    }),
);

/**
 * Public lead form — never includes tenant_id or vehicle_id from client trust.
 * Etapa 17: email + consent required; phone optional.
 */
export const createPublicLeadInputSchema = z
  .object({
    name: z.string().trim().min(1, "Numele este obligatoriu").max(120),
    email: publicLeadEmailFieldSchema,
    phone: publicLeadPhoneFieldSchema,
    message: z.preprocess(
      emptyFormFieldToUndefined,
      z.string().trim().max(2000, "Mesaj prea lung").optional(),
    ),
    consent: z.literal(true, {
      errorMap: () => ({ message: "Consimțământul este obligatoriu" }),
    }),
  })
  .strict();
export type CreatePublicLeadInput = z.infer<typeof createPublicLeadInputSchema>;

export const leadNotificationStatusSchema = z.enum([
  "pending",
  "skipped",
  "not_configured",
  "no_recipients",
  "sent",
  "failed",
]);
export type LeadNotificationStatus = z.infer<typeof leadNotificationStatusSchema>;

/** Consent copy version stamped on new public leads. */
export const PUBLIC_LEAD_CONSENT_VERSION = "v1" as const;

/** Etapa 19 — finance consent copy version. */
export const FINANCE_CONSENT_VERSION = "finance-v1" as const;

export const financeApplicantTypeSchema = z.enum(["individual", "company"]);
export type FinanceApplicantType = z.infer<typeof financeApplicantTypeSchema>;

export const financeApplicationStatusSchema = z.enum([
  "new",
  "contacted",
  "in_review",
  "approved",
  "rejected",
  "withdrawn",
  "archived",
]);
export type FinanceApplicationStatus = z.infer<typeof financeApplicationStatusSchema>;

export const FINANCE_TERM_MONTHS = [12, 24, 36, 48, 60] as const;
export type FinanceTermMonths = (typeof FINANCE_TERM_MONTHS)[number];

/**
 * Structural Romanian CUI validation (checksum), without ANAF lookup.
 * Accepts optional `RO` prefix; returns digits-only CUI or null.
 */
export function normalizeRomanianCui(raw: string): string | null {
  const trimmed = raw.trim().toUpperCase().replace(/\s+/g, "");
  const withoutRo = trimmed.startsWith("RO") ? trimmed.slice(2) : trimmed;
  if (!/^\d{2,10}$/.test(withoutRo)) return null;

  const controlKey = [7, 3, 5, 2, 1, 7, 3, 5, 2];
  const digits = withoutRo.split("").map((d) => Number(d));
  const checkDigit = digits[digits.length - 1]!;
  const body = digits.slice(0, -1);
  // Pad body on the left to 9 digits for the standard key alignment.
  while (body.length < 9) body.unshift(0);
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += body[i]! * controlKey[i]!;
  }
  let computed = (sum * 10) % 11;
  if (computed === 10) computed = 0;
  if (computed !== checkDigit) return null;
  return withoutRo;
}

/** Required finance phone — normalized E.164-style via public contact rules. */
export const financePhoneFieldSchema = z.preprocess(
  emptyFormFieldToUndefined,
  z
    .string({ required_error: "Telefonul este obligatoriu" })
    .trim()
    .min(1, "Telefonul este obligatoriu")
    .max(PUBLIC_CONTACT_INPUT_MAX, "Telefon prea lung")
    .transform((value, ctx) => {
      const normalized = normalizePublicContactNumber(value);
      if (!normalized) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Telefon invalid" });
        return z.NEVER;
      }
      return normalized;
    }),
);

/**
 * Public finance application form — never trusts client tenant/vehicle/lead ids.
 * Phone and email required; CUI required for company.
 */
export const createFinanceApplicationInputSchema = z
  .object({
    applicantType: financeApplicantTypeSchema,
    firstName: z.preprocess(
      emptyFormFieldToUndefined,
      z.string().trim().max(80).optional(),
    ),
    lastName: z.preprocess(
      emptyFormFieldToUndefined,
      z.string().trim().max(80).optional(),
    ),
    companyName: z.preprocess(
      emptyFormFieldToUndefined,
      z.string().trim().max(160).optional(),
    ),
    companyTaxId: z.preprocess(
      emptyFormFieldToUndefined,
      z.string().trim().max(16).optional(),
    ),
    email: publicLeadEmailFieldSchema,
    phone: financePhoneFieldSchema,
    amountEur: z.coerce
      .number({
        required_error: "Suma este obligatorie",
        invalid_type_error: "Sumă invalidă",
      })
      .positive("Suma trebuie să fie pozitivă")
      .max(99_999_999, "Sumă prea mare"),
    termMonths: z.coerce
      .number({
        required_error: "Perioada este obligatorie",
        invalid_type_error: "Perioadă invalidă",
      })
      .refine(
        (value): value is FinanceTermMonths =>
          (FINANCE_TERM_MONTHS as readonly number[]).includes(value),
        "Perioadă invalidă",
      ),
    consent: z.literal(true, {
      errorMap: () => ({ message: "Consimțământul este obligatoriu" }),
    }),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.applicantType === "individual") {
      if (!data.firstName?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Prenumele este obligatoriu",
          path: ["firstName"],
        });
      }
      if (!data.lastName?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Numele este obligatoriu",
          path: ["lastName"],
        });
      }
    } else {
      if (!data.companyName?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Denumirea firmei este obligatorie",
          path: ["companyName"],
        });
      }
      if (!data.companyTaxId?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "CUI-ul este obligatoriu",
          path: ["companyTaxId"],
        });
      } else if (!normalizeRomanianCui(data.companyTaxId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "CUI invalid",
          path: ["companyTaxId"],
        });
      }
    }
  })
  .transform((data) => {
    if (data.applicantType === "individual") {
      return {
        applicantType: "individual" as const,
        fullName: `${data.firstName!.trim()} ${data.lastName!.trim()}`.replace(/\s+/g, " "),
        companyTaxId: undefined as string | undefined,
        email: data.email,
        phone: data.phone,
        amountEur: data.amountEur,
        termMonths: data.termMonths as FinanceTermMonths,
        consent: true as const,
      };
    }
    return {
      applicantType: "company" as const,
      fullName: data.companyName!.trim(),
      companyTaxId: normalizeRomanianCui(data.companyTaxId!)!,
      email: data.email,
      phone: data.phone,
      amountEur: data.amountEur,
      termMonths: data.termMonths as FinanceTermMonths,
      consent: true as const,
    };
  });
export type CreateFinanceApplicationInput = z.infer<typeof createFinanceApplicationInputSchema>;

/**
 * Formats a EUR amount for Romanian storefront/dashboard: `12.900 €`.
 * Accepts numeric string or number; invalid input returns a safe fallback.
 */
export function formatPriceEurRo(price: string | number): string {
  const amount = typeof price === "number" ? price : Number(String(price).replace(",", "."));
  if (!Number.isFinite(amount)) {
    return `${price} €`;
  }
  return `${new Intl.NumberFormat("ro-RO", {
    maximumFractionDigits: 0,
  }).format(amount)} €`;
}

/**
 * Formats kilometres for Romanian UI: `145.000 km`.
 */
export function formatMileageKmRo(mileageKm: number): string {
  if (!Number.isFinite(mileageKm)) {
    return `${mileageKm} km`;
  }
  return `${new Intl.NumberFormat("ro-RO").format(Math.trunc(mileageKm))} km`;
}

/* ─── Etapa 22 — tenant company profile ─────────────────────────────────── */

export const companyEntityTypeSchema = z.enum(["srl", "sa", "pfa", "ii", "other"]);
export type CompanyEntityType = z.infer<typeof companyEntityTypeSchema>;

/** Tenant display currency for company profile (EUR|RON only). */
export const companyCurrencySchema = z.enum(["EUR", "RON"]);
export type CompanyCurrency = z.infer<typeof companyCurrencySchema>;

export const BUSINESS_HOUR_DAYS = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
] as const;
export type BusinessHourDay = (typeof BUSINESS_HOUR_DAYS)[number];

const timeHhMmSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Ora trebuie să fie HH:MM");

const businessDayHoursSchema = z
  .object({
    open: timeHhMmSchema,
    close: timeHhMmSchema,
  })
  .strict()
  .refine((value) => value.open < value.close, {
    message: "Ora de închidere trebuie să fie după ora de deschidere",
  });

/**
 * Normalized weekly hours. Missing day keys mean closed.
 * `note` is optional free text (max 200).
 */
export const businessHoursSchema = z
  .object({
    mon: businessDayHoursSchema.nullable().optional(),
    tue: businessDayHoursSchema.nullable().optional(),
    wed: businessDayHoursSchema.nullable().optional(),
    thu: businessDayHoursSchema.nullable().optional(),
    fri: businessDayHoursSchema.nullable().optional(),
    sat: businessDayHoursSchema.nullable().optional(),
    sun: businessDayHoursSchema.nullable().optional(),
    note: z.string().trim().max(200).optional(),
  })
  .strict();
export type BusinessHours = z.infer<typeof businessHoursSchema>;

/**
 * Structural Romanian Reg. Com. number (e.g. J40/1234/2020).
 * No ONRC lookup.
 */
export function normalizeRomanianRegistrationNumber(raw: string): string | null {
  const trimmed = raw.trim().toUpperCase().replace(/\s+/g, "");
  if (!trimmed || trimmed.length > 32) return null;
  const match = /^([A-Z])(\d{1,2})\/(\d{1,6})\/(\d{4})$/.exec(trimmed);
  if (!match) return null;
  const [, letter, county, serial, year] = match;
  const yearNum = Number(year);
  if (yearNum < 1990 || yearNum > 2100) return null;
  return `${letter}${Number(county)}/${Number(serial)}/${year}`;
}

/**
 * Storage / CDN path for logo or favicon. Relative path or https URL.
 * Rejects traversal, data URIs, and secrets-looking query strings.
 */
export function normalizeBrandAssetPath(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 500) return null;
  if (trimmed.includes("..") || trimmed.includes("\\")) return null;
  if (/^(data:|javascript:|file:)/i.test(trimmed)) return null;
  if (/[?#].*(token|secret|key|password|apikey)=/i.test(trimmed)) return null;

  if (/^https:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      if (url.protocol !== "https:") return null;
      return url.toString();
    } catch {
      return null;
    }
  }

  if (!/^[a-zA-Z0-9/_.-]+$/.test(trimmed)) return null;
  if (trimmed.startsWith("/")) return null;
  return trimmed;
}

const optionalNullableTrimmed = (max: number) =>
  z.preprocess((value) => {
    if (value === null) return null;
    if (typeof value === "string" && value.trim() === "") return null;
    return value;
  }, z.union([z.string().trim().max(max), z.null()]).optional());

/**
 * Dashboard upsert input for company profile.
 * Empty strings clear optional fields (null). Client tenant/owner never trusted.
 */
export const upsertCompanyProfileInputSchema = z
  .object({
    tradingName: z
      .string()
      .trim()
      .min(2, "Numele comercial trebuie să aibă cel puțin 2 caractere.")
      .max(120, "Numele comercial este prea lung."),
    legalName: optionalNullableTrimmed(200),
    taxId: z.preprocess((value) => {
      if (value === null) return null;
      if (typeof value === "string" && value.trim() === "") return null;
      return value;
    }, z.union([z.string().trim().max(16), z.null()]).optional()),
    registrationNumber: z.preprocess((value) => {
      if (value === null) return null;
      if (typeof value === "string" && value.trim() === "") return null;
      return value;
    }, z.union([z.string().trim().max(32), z.null()]).optional()),
    entityType: z.preprocess(
      emptyFormFieldToUndefined,
      companyEntityTypeSchema.optional().nullable(),
    ),
    publicEmail: z.preprocess((value) => {
      if (value === null) return null;
      if (typeof value === "string" && value.trim() === "") return null;
      return value;
    }, z.union([z.string().trim().max(160), z.null()]).optional()),
    publicPhone: z.preprocess((value) => {
      if (value === null) return null;
      if (typeof value === "string" && value.trim() === "") return null;
      return value;
    }, z.union([z.string().trim().max(PUBLIC_CONTACT_INPUT_MAX), z.null()]).optional()),
    website: z.preprocess((value) => {
      if (value === null) return null;
      if (typeof value === "string" && value.trim() === "") return null;
      return value;
    }, z.union([z.string().trim().max(300), z.null()]).optional()),
    registeredAddress: optionalNullableTrimmed(300),
    showroomAddress: optionalNullableTrimmed(300),
    city: optionalNullableTrimmed(80),
    county: optionalNullableTrimmed(80),
    country: z.preprocess(
      emptyFormFieldToUndefined,
      z
        .string()
        .trim()
        .length(2, "Țara trebuie să fie un cod ISO de 2 litere")
        .transform((value) => value.toUpperCase())
        .optional()
        .nullable(),
    ),
    postalCode: optionalNullableTrimmed(16),
    businessHours: businessHoursSchema.optional(),
    logoPath: z.preprocess((value) => {
      if (value === null) return null;
      if (typeof value === "string" && value.trim() === "") return null;
      return value;
    }, z.union([z.string().trim().max(500), z.null()]).optional()),
    faviconPath: z.preprocess((value) => {
      if (value === null) return null;
      if (typeof value === "string" && value.trim() === "") return null;
      return value;
    }, z.union([z.string().trim().max(500), z.null()]).optional()),
    currency: companyCurrencySchema.optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.taxId != null && data.taxId !== undefined) {
      if (!normalizeRomanianCui(data.taxId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["taxId"],
          message: "CUI invalid",
        });
      }
    }
    if (data.registrationNumber != null && data.registrationNumber !== undefined) {
      if (!normalizeRomanianRegistrationNumber(data.registrationNumber)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["registrationNumber"],
          message: "Număr Registrul Comerțului invalid",
        });
      }
    }
    if (data.publicEmail != null && data.publicEmail !== undefined) {
      const email = data.publicEmail.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["publicEmail"],
          message: "Email invalid",
        });
      }
    }
    if (data.publicPhone != null && data.publicPhone !== undefined) {
      if (!normalizePublicContactNumber(data.publicPhone)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["publicPhone"],
          message: "Telefon invalid",
        });
      }
    }
    if (data.website != null && data.website !== undefined) {
      try {
        const url = new URL(
          /^https?:\/\//i.test(data.website) ? data.website : `https://${data.website}`,
        );
        if (url.protocol !== "http:" && url.protocol !== "https:") {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["website"],
            message: "Website invalid",
          });
        }
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["website"],
          message: "Website invalid",
        });
      }
    }
    if (data.logoPath != null && data.logoPath !== undefined) {
      if (!normalizeBrandAssetPath(data.logoPath)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["logoPath"],
          message: "Referință logo invalidă",
        });
      }
    }
    if (data.faviconPath != null && data.faviconPath !== undefined) {
      if (!normalizeBrandAssetPath(data.faviconPath)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["faviconPath"],
          message: "Referință favicon invalidă",
        });
      }
    }
    const country = data.country ?? "RO";
    if (country === "RO" && data.postalCode) {
      if (!/^\d{6}$/.test(data.postalCode.trim())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["postalCode"],
          message: "Codul poștal din România trebuie să aibă 6 cifre",
        });
      }
    }
    if (country === "RO" && data.postalCode && !data.city) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["city"],
        message: "Localitatea este obligatorie când este setat codul poștal",
      });
    }
  })
  .transform((data) => {
    const taxId =
      data.taxId == null || data.taxId === undefined
        ? data.taxId
        : normalizeRomanianCui(data.taxId);
    const registrationNumber =
      data.registrationNumber == null || data.registrationNumber === undefined
        ? data.registrationNumber
        : normalizeRomanianRegistrationNumber(data.registrationNumber);
    const publicEmail =
      data.publicEmail == null || data.publicEmail === undefined
        ? data.publicEmail
        : data.publicEmail.trim().toLowerCase();
    const publicPhone =
      data.publicPhone == null || data.publicPhone === undefined
        ? data.publicPhone
        : normalizePublicContactNumber(data.publicPhone);
    let website = data.website;
    if (website != null && website !== undefined) {
      const withProto = /^https?:\/\//i.test(website) ? website : `https://${website}`;
      website = new URL(withProto).toString().replace(/\/$/, "");
    }
    const logoPath =
      data.logoPath == null || data.logoPath === undefined
        ? data.logoPath
        : normalizeBrandAssetPath(data.logoPath);
    const faviconPath =
      data.faviconPath == null || data.faviconPath === undefined
        ? data.faviconPath
        : normalizeBrandAssetPath(data.faviconPath);

    return {
      tradingName: data.tradingName,
      legalName: data.legalName === undefined ? undefined : data.legalName,
      taxId: taxId === undefined ? undefined : taxId,
      registrationNumber:
        registrationNumber === undefined ? undefined : registrationNumber,
      entityType: data.entityType === undefined ? undefined : data.entityType,
      publicEmail: publicEmail === undefined ? undefined : publicEmail,
      publicPhone: publicPhone === undefined ? undefined : publicPhone,
      website: website === undefined ? undefined : website,
      registeredAddress:
        data.registeredAddress === undefined ? undefined : data.registeredAddress,
      showroomAddress:
        data.showroomAddress === undefined ? undefined : data.showroomAddress,
      city: data.city === undefined ? undefined : data.city,
      county: data.county === undefined ? undefined : data.county,
      country: data.country === undefined ? undefined : data.country,
      postalCode: data.postalCode === undefined ? undefined : data.postalCode,
      businessHours: data.businessHours,
      logoPath: logoPath === undefined ? undefined : logoPath,
      faviconPath: faviconPath === undefined ? undefined : faviconPath,
      currency: data.currency,
    };
  });
export type UpsertCompanyProfileInput = z.infer<typeof upsertCompanyProfileInputSchema>;

/**
 * Explicit public company projection for storefront (no tenant id, no timestamps).
 * All fields optional — empty profile yields an empty-friendly view.
 */
export type PublicCompanyView = {
  legalName?: string;
  tradingName?: string;
  taxId?: string;
  registrationNumber?: string;
  entityType?: CompanyEntityType;
  publicEmail?: string;
  publicPhone?: string;
  website?: string;
  registeredAddress?: string;
  showroomAddress?: string;
  city?: string;
  county?: string;
  country?: string;
  postalCode?: string;
  businessHours?: BusinessHours;
  logoPath?: string;
  faviconPath?: string;
  currency?: CompanyCurrency;
};

/** Staff dashboard view — still no secrets; includes timestamps for UI only. */
export type CompanyProfileView = PublicCompanyView & {
  updatedAt?: string;
};

/* ─── Etapa 23A — CMS pages + basic SEO ─────────────────────────────────── */

export const tenantPageStatusSchema = z.enum(["draft", "published"]);
export type TenantPageStatus = z.infer<typeof tenantPageStatusSchema>;

export const tenantPageKindSchema = z.enum([
  "custom",
  "about",
  "contact",
  "terms",
  "privacy",
  "cookies",
]);
export type TenantPageKind = z.infer<typeof tenantPageKindSchema>;

/** Fixed legal slugs (RO) mapped to page_kind. */
export const LEGAL_PAGE_SLUGS = [
  "despre",
  "contact",
  "termeni",
  "confidentialitate",
  "cookies",
] as const;
export type LegalPageSlug = (typeof LEGAL_PAGE_SLUGS)[number];

export const LEGAL_SLUG_TO_KIND: Record<LegalPageSlug, TenantPageKind> = {
  despre: "about",
  contact: "contact",
  termeni: "terms",
  confidentialitate: "privacy",
  cookies: "cookies",
};

export const KIND_TO_LEGAL_SLUG: Partial<Record<TenantPageKind, LegalPageSlug>> = {
  about: "despre",
  contact: "contact",
  terms: "termeni",
  privacy: "confidentialitate",
  cookies: "cookies",
};

const PAGE_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Normalizes a CMS slug (lowercase kebab). Returns null when invalid.
 * Reserved legal slugs are allowed; arbitrary HTML/path segments are rejected.
 */
export function normalizeTenantPageSlug(raw: string): string | null {
  const slug = raw.trim().toLowerCase().replace(/\s+/g, "-");
  if (slug.length < 2 || slug.length > 64) return null;
  if (!PAGE_SLUG_RE.test(slug)) return null;
  if (slug.includes("..") || slug.includes("/") || slug.includes("\\")) return null;
  return slug;
}

/**
 * Strips HTML/script/iframe and rejects javascript: URLs.
 * Returns sanitized plain text (markdown punctuation may remain as text).
 */
export function sanitizeTenantPageBody(raw: string): string | null {
  if (typeof raw !== "string") return null;
  let body = raw.replace(/\u0000/g, "");
  if (/javascript\s*:/i.test(body)) return null;
  if (/<\s*(script|iframe|object|embed|link|meta|style)\b/i.test(body)) return null;
  if (/on\w+\s*=/i.test(body)) return null;
  // Strip remaining tags.
  body = body.replace(/<[^>]*>/g, "");
  body = body.replace(/\r\n/g, "\n");
  if (body.length > 50_000) return null;
  return body;
}

export function sanitizeOptionalSeoField(
  raw: string | null | undefined,
  max: number,
): string | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.length > max) return null;
  if (/[<>]/.test(trimmed) || /javascript\s*:/i.test(trimmed)) return null;
  return trimmed;
}

export const createTenantPageInputSchema = z
  .object({
    title: z.string().trim().min(1, "Titlul este obligatoriu").max(160),
    slug: z.string().trim().min(2).max(64),
    body: z.string().max(50_000).default(""),
    pageKind: tenantPageKindSchema.default("custom"),
    seoTitle: z.string().trim().max(70).optional().nullable(),
    seoDescription: z.string().trim().max(160).optional().nullable(),
  })
  .strict()
  .superRefine((data, ctx) => {
    const slug = normalizeTenantPageSlug(data.slug);
    if (!slug) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["slug"],
        message: "Slug invalid",
      });
      return;
    }
    const kind = data.pageKind;
    if (kind !== "custom") {
      const expected = KIND_TO_LEGAL_SLUG[kind];
      if (expected && slug !== expected) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["slug"],
          message: "Slug-ul legal nu poate fi schimbat",
        });
      }
    }
    // custom + legal slug is allowed; transform upgrades pageKind automatically.
    const body = sanitizeTenantPageBody(data.body);
    if (body === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["body"],
        message: "Conținut invalid",
      });
    }
    if (sanitizeOptionalSeoField(data.seoTitle, 70) === null && data.seoTitle?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["seoTitle"],
        message: "Titlu SEO invalid",
      });
    }
    if (
      sanitizeOptionalSeoField(data.seoDescription, 160) === null &&
      data.seoDescription?.trim()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["seoDescription"],
        message: "Descriere SEO invalidă",
      });
    }
  })
  .transform((data) => {
    const slug = normalizeTenantPageSlug(data.slug)!;
    let pageKind = data.pageKind;
    if ((LEGAL_PAGE_SLUGS as readonly string[]).includes(slug)) {
      pageKind = LEGAL_SLUG_TO_KIND[slug as LegalPageSlug];
    }
    return {
      title: data.title.trim(),
      slug,
      body: sanitizeTenantPageBody(data.body) ?? "",
      pageKind,
      seoTitle: sanitizeOptionalSeoField(data.seoTitle, 70) ?? null,
      seoDescription: sanitizeOptionalSeoField(data.seoDescription, 160) ?? null,
    };
  });
export type CreateTenantPageInput = z.infer<typeof createTenantPageInputSchema>;

export const updateTenantPageInputSchema = z
  .object({
    pageId: z.string().uuid("Pagină invalidă"),
    title: z.string().trim().min(1).max(160),
    slug: z.string().trim().min(2).max(64),
    body: z.string().max(50_000).default(""),
    pageKind: tenantPageKindSchema,
    seoTitle: z.string().trim().max(70).optional().nullable(),
    seoDescription: z.string().trim().max(160).optional().nullable(),
  })
  .strict()
  .superRefine((data, ctx) => {
    const slug = normalizeTenantPageSlug(data.slug);
    if (!slug) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["slug"],
        message: "Slug invalid",
      });
      return;
    }
    if (data.pageKind !== "custom") {
      const expected = KIND_TO_LEGAL_SLUG[data.pageKind];
      if (expected && slug !== expected) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["slug"],
          message: "Slug-ul legal nu poate fi schimbat",
        });
      }
    }
    if (sanitizeTenantPageBody(data.body) === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["body"],
        message: "Conținut invalid",
      });
    }
  })
  .transform((data) => ({
    pageId: data.pageId,
    title: data.title.trim(),
    slug: normalizeTenantPageSlug(data.slug)!,
    body: sanitizeTenantPageBody(data.body) ?? "",
    pageKind:
      (LEGAL_PAGE_SLUGS as readonly string[]).includes(normalizeTenantPageSlug(data.slug)!)
        ? LEGAL_SLUG_TO_KIND[normalizeTenantPageSlug(data.slug)! as LegalPageSlug]
        : data.pageKind === "custom"
          ? "custom"
          : data.pageKind,
    seoTitle: sanitizeOptionalSeoField(data.seoTitle, 70) ?? null,
    seoDescription: sanitizeOptionalSeoField(data.seoDescription, 160) ?? null,
  }));
export type UpdateTenantPageInput = z.infer<typeof updateTenantPageInputSchema>;

export const tenantPageIdInputSchema = z
  .object({
    pageId: z.string().uuid("Pagină invalidă"),
  })
  .strict();

export const upsertTenantSeoSettingsInputSchema = z
  .object({
    seoTitleDefault: z.string().trim().max(70).optional().nullable(),
    seoDescriptionDefault: z.string().trim().max(160).optional().nullable(),
    faviconPath: z.string().trim().max(500).optional().nullable(),
    indexingEnabled: z.boolean(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (
      data.seoTitleDefault != null &&
      data.seoTitleDefault !== "" &&
      sanitizeOptionalSeoField(data.seoTitleDefault, 70) === null
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["seoTitleDefault"],
        message: "Titlu SEO invalid",
      });
    }
    if (
      data.seoDescriptionDefault != null &&
      data.seoDescriptionDefault !== "" &&
      sanitizeOptionalSeoField(data.seoDescriptionDefault, 160) === null
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["seoDescriptionDefault"],
        message: "Descriere SEO invalidă",
      });
    }
    if (
      data.faviconPath != null &&
      data.faviconPath !== "" &&
      !normalizeBrandAssetPath(data.faviconPath)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["faviconPath"],
        message: "Referință favicon invalidă",
      });
    }
  })
  .transform((data) => ({
    seoTitleDefault: sanitizeOptionalSeoField(data.seoTitleDefault, 70) ?? null,
    seoDescriptionDefault: sanitizeOptionalSeoField(data.seoDescriptionDefault, 160) ?? null,
    faviconPath:
      data.faviconPath == null || data.faviconPath === ""
        ? null
        : normalizeBrandAssetPath(data.faviconPath),
    indexingEnabled: data.indexingEnabled,
  }));
export type UpsertTenantSeoSettingsInput = z.infer<typeof upsertTenantSeoSettingsInputSchema>;

export type PublicTenantPageView = {
  slug: string;
  title: string;
  body: string;
  pageKind: TenantPageKind;
  seoTitle?: string;
  seoDescription?: string;
};

export type PublicSeoSettingsView = {
  seoTitleDefault?: string;
  seoDescriptionDefault?: string;
  faviconPath?: string;
  indexingEnabled: boolean;
};

export type TenantPageListItem = {
  /** Opaque form id — never shown in public UI labels. */
  pageId: string;
  slug: string;
  title: string;
  status: TenantPageStatus;
  pageKind: TenantPageKind;
  updatedAt: string;
  publishedAt?: string;
};
