import { z } from "zod";

/** Landing kinds that require catalog_filters + ≥1 vehicle to publish. */
export const INVENTORY_PAGE_KINDS = [
  "local_inventory",
  "brand_inventory",
  "body_type_inventory",
  "fuel_inventory",
] as const;
export type InventoryPageKind = (typeof INVENTORY_PAGE_KINDS)[number];

export function isInventoryPageKind(kind: string): kind is InventoryPageKind {
  return (INVENTORY_PAGE_KINDS as readonly string[]).includes(kind);
}

/** Minimum combined intro+body length for publish (anti-thin). */
export const CMS_PUBLISH_MIN_CONTENT_CHARS = 120;
export const CMS_PUBLISH_META_MIN = 50;
export const CMS_PUBLISH_META_MAX = 160;
export const CMS_FAQ_MAX_ITEMS = 12;
export const CMS_INTERNAL_LINKS_MAX = 12;

const FORBIDDEN_FILTER_KEYS = [
  "tenant_id",
  "tenantId",
  "status",
  "vin",
  "id",
  "limit",
  "offset",
  "orderBy",
  "pageSize",
  "page_size",
] as const;

/** Keep in sync with vehicleFuelSchema / vehicleBodyTypeSchema / vehicleTransmissionSchema. */
const FUEL_VALUES = [
  "petrol",
  "diesel",
  "hybrid",
  "plugin_hybrid",
  "electric",
  "lpg",
  "cng",
  "other",
] as const;
const BODY_VALUES = [
  "sedan",
  "hatchback",
  "estate",
  "suv",
  "coupe",
  "convertible",
  "van",
  "pickup",
  "mpv",
  "other",
] as const;
const TRANSMISSION_VALUES = ["manual", "automatic", "dct", "cvt", "other"] as const;

/**
 * Relative tenant-local path only.
 * Allows `/`, `/p/slug`, `/vehicles/slug`, `/compara`, `/salvate`, optional hash.
 */
export function normalizeTenantLocalPath(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.includes("://") || trimmed.startsWith("//")) return null;
  if (trimmed.includes("..") || trimmed.includes("\\")) return null;
  if (/[\u0000-\u001F\u007F]/.test(trimmed)) return null;
  if (!trimmed.startsWith("/")) return null;
  if (trimmed.length > 200) return null;

  const hashIdx = trimmed.indexOf("#");
  const pathPart = hashIdx >= 0 ? trimmed.slice(0, hashIdx) : trimmed;
  const hashPart = hashIdx >= 0 ? trimmed.slice(hashIdx + 1) : undefined;
  const path = pathPart || "/";

  const allowed =
    path === "/" ||
    path === "/compara" ||
    path === "/salvate" ||
    /^\/p\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(path) ||
    /^\/vehicles\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(path);

  if (!allowed) return null;

  if (hashPart !== undefined) {
    if (!/^[a-z0-9_-]{1,64}$/i.test(hashPart)) return null;
    return `${path}#${hashPart}`;
  }
  return path;
}

/** Canonical override: only `/`, `/p/slug`, `/vehicles/slug`. */
export function normalizeCanonicalPath(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.includes("://") || trimmed.startsWith("//")) return null;
  if (trimmed.includes("..") || trimmed.includes("#") || trimmed.includes("?")) return null;
  if (trimmed === "/") return "/";
  if (/^\/p\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(trimmed)) return trimmed;
  if (/^\/vehicles\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(trimmed)) return trimmed;
  return null;
}

export function selfCanonicalPathForSlug(slug: string): string {
  return `/p/${slug}`;
}

/**
 * Resolve public canonical path: valid override or self.
 * Never returns absolute URL — caller absolutizes with Host origin.
 */
export function resolvePageCanonicalPath(
  slug: string,
  override: string | null | undefined,
): string {
  const self = selfCanonicalPathForSlug(slug);
  const normalized = normalizeCanonicalPath(override);
  return normalized ?? self;
}

/** True when page is the canonical document for its URL (sitemap-eligible). */
export function isSelfCanonicalPage(
  slug: string,
  canonicalPath: string | null | undefined,
): boolean {
  if (!canonicalPath) return true;
  return resolvePageCanonicalPath(slug, canonicalPath) === selfCanonicalPathForSlug(slug);
}

export const tenantPageFaqItemSchema = z
  .object({
    question: z.string().trim().min(3).max(200),
    answer: z.string().trim().min(3).max(2000),
  })
  .strict();

export const tenantPageInternalLinkSchema = z
  .object({
    label: z.string().trim().min(1).max(80),
    path: z.string().trim().min(1).max(200),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (!normalizeTenantLocalPath(data.path)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["path"],
        message: "Link intern invalid (doar path local)",
      });
    }
  })
  .transform((data) => ({
    label: data.label.trim(),
    path: normalizeTenantLocalPath(data.path)!,
  }));

/**
 * Whitelisted catalog filters for inventory landings.
 * Stable shape — no arbitrary client keys, no private filters.
 */
export const landingCatalogFiltersSchema = z
  .object({
    make: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
    fuel: z.array(z.enum(FUEL_VALUES)).max(8).optional(),
    transmission: z.array(z.enum(TRANSMISSION_VALUES)).max(6).optional(),
    bodyType: z.array(z.enum(BODY_VALUES)).max(12).optional(),
    priceMin: z.number().int().min(0).max(10_000_000).nullable().optional(),
    priceMax: z.number().int().min(0).max(10_000_000).nullable().optional(),
    yearMin: z.number().int().min(1950).max(2100).nullable().optional(),
    yearMax: z.number().int().min(1950).max(2100).nullable().optional(),
    kmMin: z.number().int().min(0).max(2_000_000).nullable().optional(),
    kmMax: z.number().int().min(0).max(2_000_000).nullable().optional(),
  })
  .strict()
  .transform((data) => {
    const make = [...new Set((data.make ?? []).map((m) => m.trim()).filter(Boolean))];
    return {
      ...(make.length ? { make } : {}),
      ...(data.fuel?.length ? { fuel: [...data.fuel] } : {}),
      ...(data.transmission?.length ? { transmission: [...data.transmission] } : {}),
      ...(data.bodyType?.length ? { bodyType: [...data.bodyType] } : {}),
      ...(data.priceMin != null ? { priceMin: data.priceMin } : {}),
      ...(data.priceMax != null ? { priceMax: data.priceMax } : {}),
      ...(data.yearMin != null ? { yearMin: data.yearMin } : {}),
      ...(data.yearMax != null ? { yearMax: data.yearMax } : {}),
      ...(data.kmMin != null ? { kmMin: data.kmMin } : {}),
      ...(data.kmMax != null ? { kmMax: data.kmMax } : {}),
    };
  });

export type LandingCatalogFilters = z.infer<typeof landingCatalogFiltersSchema>;

export function sanitizeLandingCatalogFilters(raw: unknown): LandingCatalogFilters | null {
  if (raw == null) return {};
  if (typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    if ((FORBIDDEN_FILTER_KEYS as readonly string[]).includes(key)) {
      return null;
    }
  }
  const parsed = landingCatalogFiltersSchema.safeParse(obj);
  return parsed.success ? parsed.data : null;
}

export function landingFiltersHaveConstraint(filters: LandingCatalogFilters): boolean {
  return Boolean(
    (filters.make && filters.make.length > 0) ||
      (filters.fuel && filters.fuel.length > 0) ||
      (filters.transmission && filters.transmission.length > 0) ||
      (filters.bodyType && filters.bodyType.length > 0) ||
      filters.priceMin != null ||
      filters.priceMax != null ||
      filters.yearMin != null ||
      filters.yearMax != null ||
      filters.kmMin != null ||
      filters.kmMax != null,
  );
}

/** Convert landing filters to search-params-like record for catalog parser. */
export function landingFiltersToSearchParamsRecord(
  filters: LandingCatalogFilters,
): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  if (filters.make?.length) out.make = filters.make;
  if (filters.fuel?.length) out.fuel = filters.fuel;
  if (filters.transmission?.length) out.transmission = filters.transmission;
  if (filters.bodyType?.length) out.bodyType = filters.bodyType;
  if (filters.priceMin != null) out.priceMin = String(filters.priceMin);
  if (filters.priceMax != null) out.priceMax = String(filters.priceMax);
  if (filters.yearMin != null) out.yearMin = String(filters.yearMin);
  if (filters.yearMax != null) out.yearMax = String(filters.yearMax);
  if (filters.kmMin != null) out.kmMin = String(filters.kmMin);
  if (filters.kmMax != null) out.kmMax = String(filters.kmMax);
  return out;
}

export type CmsPublishGateInput = {
  title: string;
  h1?: string | null;
  intro?: string | null;
  body: string;
  seoDescription?: string | null;
  pageKind: string;
  catalogFilters?: LandingCatalogFilters | null;
  /** Pre-counted available vehicles for inventory kinds (caller). */
  inventoryVehicleCount?: number;
  faq?: Array<{ question: string; answer: string }>;
  ctaLabel?: string | null;
  ctaHref?: string | null;
};

/**
 * Editorial publish gates. Returns null when OK, else RO error message.
 */
export function validateCmsPageForPublish(input: CmsPublishGateInput): string | null {
  const title = input.title.trim();
  if (!title) return "Titlul este obligatoriu pentru publicare.";
  const h1 = (input.h1 ?? title).trim();
  if (!h1) return "H1 este obligatoriu pentru publicare.";

  const intro = (input.intro ?? "").trim();
  const body = (input.body ?? "").trim();
  if (intro.length + body.length < CMS_PUBLISH_MIN_CONTENT_CHARS) {
    return `Conținutul editorial este prea scurt (minim ${CMS_PUBLISH_MIN_CONTENT_CHARS} caractere intro+body).`;
  }

  const meta = (input.seoDescription ?? "").trim();
  if (!meta) return "Meta description este obligatorie pentru publicare.";
  if (meta.length < CMS_PUBLISH_META_MIN || meta.length > CMS_PUBLISH_META_MAX) {
    return `Meta description trebuie să aibă între ${CMS_PUBLISH_META_MIN} și ${CMS_PUBLISH_META_MAX} caractere.`;
  }

  const ctaLabel = (input.ctaLabel ?? "").trim();
  const ctaHref = (input.ctaHref ?? "").trim();
  if (ctaLabel && !ctaHref) return "CTA-ul necesită un path local valid.";
  if (ctaHref && !normalizeTenantLocalPath(ctaHref)) {
    return "CTA path invalid (doar path local, fără URL absolut).";
  }
  if (ctaHref && !ctaLabel) return "CTA-ul necesită etichetă.";

  if (input.faq) {
    for (const item of input.faq) {
      if (!item.question?.trim() || !item.answer?.trim()) {
        return "FAQ-ul trebuie să aibă întrebări și răspunsuri complete.";
      }
    }
  }

  if (isInventoryPageKind(input.pageKind)) {
    const filters = input.catalogFilters ?? {};
    if (!landingFiltersHaveConstraint(filters)) {
      return "Paginile de inventar necesită filtre de catalog (marcă / combustibil / caroserie etc.).";
    }
    const count = input.inventoryVehicleCount ?? 0;
    if (count < 1) {
      return "Nu poți publica o pagină de inventar fără vehicule disponibile pentru filtrele alese.";
    }
  }

  return null;
}
