import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lte,
  ne,
  or,
  type SQL,
} from "drizzle-orm";
import { getDb, vehicles } from "@auto-platform/db";
import { clearPublicSessionGucs } from "./clear-public-session";
import { toPublicVehicleDto, type PublicVehicleDto } from "./public-dto";
import {
  attachPublicCoverImages,
  attachPublicDetailImages,
  type PublicVehicleCatalogDto,
  type PublicVehicleDetailDto,
} from "./public-vehicle-media";
import { filterPublicAlternativeRows } from "./public-vehicle-alternatives";
import {
  CATALOG_PAGE_SIZE,
  clampCatalogPage,
  DEFAULT_CATALOG_QUERY,
  escapeIlikePattern,
  parseCatalogSearchParams,
  type CatalogQuery,
  type CatalogSort,
} from "./catalog-query";

export type { PublicVehicleDto, PublicVehicleFeatureDto } from "./public-dto";
export { PUBLIC_VEHICLE_DTO_KEYS } from "./public-dto";
export type {
  PublicVehicleCatalogDto,
  PublicVehicleDetailDto,
  PublicVehicleImageDto,
} from "./public-vehicle-media";
export { PUBLIC_VEHICLE_IMAGE_DTO_KEYS } from "./public-vehicle-media";
export type { CatalogQuery, CatalogSort } from "./catalog-query";
export {
  CATALOG_PAGE_SIZE,
  CATALOG_SORT_VALUES,
  CATALOG_SORT_LABELS_RO,
  DEFAULT_CATALOG_QUERY,
  parseCatalogSearchParams,
  catalogQueryHasFilters,
  buildCatalogHref,
  catalogQueryToSearchParams,
} from "./catalog-query";

/** Full public row — detail / legacy list. */
const publicVehicleSelect = {
  slug: vehicles.slug,
  make: vehicles.make,
  model: vehicles.model,
  year: vehicles.year,
  mileage: vehicles.mileage,
  price: vehicles.price,
  currency: vehicles.currency,
  fuel: vehicles.fuel,
  transmission: vehicles.transmission,
  bodyType: vehicles.bodyType,
  condition: vehicles.condition,
  powerHp: vehicles.powerHp,
  description: vehicles.description,
  driveType: vehicles.driveType,
  engineDisplacementCc: vehicles.engineDisplacementCc,
  emissionStandard: vehicles.emissionStandard,
  doors: vehicles.doors,
  seats: vehicles.seats,
  exteriorColor: vehicles.exteriorColor,
  interiorColor: vehicles.interiorColor,
  firstRegistrationYear: vehicles.firstRegistrationYear,
  firstRegistrationMonth: vehicles.firstRegistrationMonth,
  priceNegotiable: vehicles.priceNegotiable,
  vatRegime: vehicles.vatRegime,
  originCountry: vehicles.originCountry,
  locationCity: vehicles.locationCity,
  warrantyMonths: vehicles.warrantyMonths,
  warrantyNotes: vehicles.warrantyNotes,
  hasServiceBook: vehicles.hasServiceBook,
  hasServiceHistory: vehicles.hasServiceHistory,
  accidentStatus: vehicles.accidentStatus,
  features: vehicles.features,
  tenantId: vehicles.tenantId,
  status: vehicles.status,
  id: vehicles.id,
  createdAt: vehicles.createdAt,
} as const;

/**
 * Catalog card columns only — skips description/features and other detail-heavy fields.
 * Server still selects `id` for cover attach; `id` never enters the public DTO.
 */
const publicCatalogVehicleSelect = {
  slug: vehicles.slug,
  make: vehicles.make,
  model: vehicles.model,
  year: vehicles.year,
  mileage: vehicles.mileage,
  price: vehicles.price,
  currency: vehicles.currency,
  fuel: vehicles.fuel,
  transmission: vehicles.transmission,
  bodyType: vehicles.bodyType,
  condition: vehicles.condition,
  powerHp: vehicles.powerHp,
  priceNegotiable: vehicles.priceNegotiable,
  vatRegime: vehicles.vatRegime,
  locationCity: vehicles.locationCity,
  tenantId: vehicles.tenantId,
  status: vehicles.status,
  id: vehicles.id,
  createdAt: vehicles.createdAt,
} as const;

function toPublicCatalogVehicleDto(row: {
  slug: string;
  make: string;
  model: string;
  year: number;
  mileage: number;
  price: string;
  currency: string;
  fuel: unknown;
  transmission: unknown;
  bodyType: unknown;
  condition: unknown;
  powerHp: unknown;
  priceNegotiable: unknown;
  vatRegime: unknown;
  locationCity: unknown;
}): PublicVehicleDto {
  return toPublicVehicleDto({
    slug: row.slug,
    make: row.make,
    model: row.model,
    year: row.year,
    mileage: row.mileage,
    price: row.price,
    currency: row.currency,
    fuel: row.fuel,
    transmission: row.transmission,
    bodyType: row.bodyType,
    condition: row.condition,
    powerHp: row.powerHp,
    priceNegotiable: row.priceNegotiable,
    vatRegime: row.vatRegime,
    locationCity: row.locationCity,
    description: null,
    driveType: null,
    engineDisplacementCc: null,
    emissionStandard: null,
    doors: null,
    seats: null,
    exteriorColor: null,
    interiorColor: null,
    firstRegistrationYear: null,
    firstRegistrationMonth: null,
    originCountry: null,
    warrantyMonths: null,
    warrantyNotes: null,
    hasServiceBook: false,
    hasServiceHistory: false,
    accidentStatus: null,
    features: [],
  });
}

export type PublicCatalogResult = {
  items: PublicVehicleCatalogDto[];
  total: number;
  page: number;
  pageSize: typeof CATALOG_PAGE_SIZE;
  totalPages: number;
  query: CatalogQuery;
};

function isCatalogQuery(value: unknown): value is CatalogQuery {
  if (!value || typeof value !== "object" || value instanceof URLSearchParams) {
    return false;
  }
  const q = value as Partial<CatalogQuery>;
  return (
    Array.isArray(q.fuel) &&
    typeof q.sort === "string" &&
    typeof q.page === "number"
  );
}

function resolveCatalogQuery(
  query?: CatalogQuery | URLSearchParams | Record<string, string | string[] | undefined>,
): CatalogQuery {
  if (!query) return { ...DEFAULT_CATALOG_QUERY };
  if (isCatalogQuery(query)) {
    return {
      ...DEFAULT_CATALOG_QUERY,
      ...query,
      make: query.make ?? [],
      fuel: query.fuel ?? [],
      transmission: query.transmission ?? [],
      bodyType: query.bodyType ?? [],
    };
  }
  return parseCatalogSearchParams(
    query as URLSearchParams | Record<string, string | string[] | undefined>,
  );
}

function buildPublicCatalogWhere(tenantId: string, query: CatalogQuery): SQL {
  const parts: SQL[] = [
    eq(vehicles.tenantId, tenantId),
    eq(vehicles.status, "available"),
  ];

  if (query.q) {
    const pattern = `%${escapeIlikePattern(query.q)}%`;
    parts.push(or(ilike(vehicles.make, pattern), ilike(vehicles.model, pattern))!);
  }
  if (query.make.length > 0) {
    const makeParts = query.make.map(
      (m) => ilike(vehicles.make, escapeIlikePattern(m)),
    );
    parts.push(or(...makeParts)!);
  }
  if (query.priceMin !== null) {
    parts.push(gte(vehicles.price, String(query.priceMin)));
  }
  if (query.priceMax !== null) {
    parts.push(lte(vehicles.price, String(query.priceMax)));
  }
  if (query.yearMin !== null) {
    parts.push(gte(vehicles.year, query.yearMin));
  }
  if (query.yearMax !== null) {
    parts.push(lte(vehicles.year, query.yearMax));
  }
  if (query.kmMin !== null) {
    parts.push(gte(vehicles.mileage, query.kmMin));
  }
  if (query.kmMax !== null) {
    parts.push(lte(vehicles.mileage, query.kmMax));
  }
  if (query.fuel.length > 0) {
    parts.push(inArray(vehicles.fuel, query.fuel));
  }
  if (query.transmission.length > 0) {
    parts.push(inArray(vehicles.transmission, query.transmission));
  }
  if (query.bodyType.length > 0) {
    parts.push(inArray(vehicles.bodyType, query.bodyType));
  }

  return and(...parts)!;
}

function orderBySort(sort: CatalogSort) {
  const tie = asc(vehicles.id);
  switch (sort) {
    case "price_asc":
      return [asc(vehicles.price), tie];
    case "price_desc":
      return [desc(vehicles.price), tie];
    case "year_desc":
      return [desc(vehicles.year), tie];
    case "mileage_asc":
      return [asc(vehicles.mileage), tie];
    case "newest":
    default:
      return [desc(vehicles.createdAt), tie];
  }
}

/**
 * Lists publicly available vehicles for a tenant (unpaginated legacy helper).
 * Prefer `listPublicVehiclesForCatalog` for the storefront.
 */
export async function listPublicVehicles(tenantId: string): Promise<PublicVehicleDto[]> {
  const db = getDb();
  await clearPublicSessionGucs(db);

  const rows = await db
    .select(publicVehicleSelect)
    .from(vehicles)
    .where(and(eq(vehicles.tenantId, tenantId), eq(vehicles.status, "available")))
    .orderBy(desc(vehicles.createdAt), asc(vehicles.id));

  return rows
    .filter((row) => row.tenantId === tenantId && row.status === "available")
    .map((row) => toPublicVehicleDto(row));
}

/**
 * Public catalog with Zod-validated filters, sort allowlist, fixed pageSize=12.
 * Tenant and status are never taken from the client query.
 */
export async function listPublicVehiclesForCatalog(
  tenantId: string,
  queryInput?: CatalogQuery | URLSearchParams | Record<string, string | string[] | undefined>,
): Promise<PublicCatalogResult> {
  const parsed = resolveCatalogQuery(queryInput);
  const db = getDb();
  await clearPublicSessionGucs(db);

  const where = buildPublicCatalogWhere(tenantId, parsed);

  const [countRow] = await db.select({ value: count() }).from(vehicles).where(where);
  const total = Number(countRow?.value ?? 0);
  const page = clampCatalogPage(parsed.page, total);
  const query: CatalogQuery = { ...parsed, page };
  const totalPages = Math.max(1, Math.ceil(total / CATALOG_PAGE_SIZE) || 1);
  const offset = (page - 1) * CATALOG_PAGE_SIZE;

  const rows = await db
    .select(publicCatalogVehicleSelect)
    .from(vehicles)
    .where(where)
    .orderBy(...orderBySort(query.sort))
    .limit(CATALOG_PAGE_SIZE)
    .offset(offset);

  const catalogRows = rows.filter(
    (row) => row.tenantId === tenantId && row.status === "available",
  );

  const items = await attachPublicCoverImages(
    tenantId,
    catalogRows.map((row) => ({
      vehicle: toPublicCatalogVehicleDto(row),
      vehicleId: row.id,
    })),
  );

  return {
    items,
    total,
    page,
    pageSize: CATALOG_PAGE_SIZE,
    totalPages: total === 0 ? 1 : totalPages,
    query,
  };
}

/**
 * Loads one publicly available vehicle by slug for the Host tenant.
 * Returns null when missing, wrong tenant, or not available.
 */
export async function getPublicVehicleBySlug(
  tenantId: string,
  slug: string,
): Promise<PublicVehicleDto | null> {
  const db = getDb();
  await clearPublicSessionGucs(db);

  const [row] = await db
    .select(publicVehicleSelect)
    .from(vehicles)
    .where(
      and(
        eq(vehicles.tenantId, tenantId),
        eq(vehicles.slug, slug),
        eq(vehicles.status, "available"),
      ),
    )
    .limit(1);

  if (!row || row.tenantId !== tenantId || row.status !== "available") {
    return null;
  }

  return toPublicVehicleDto(row);
}

export async function getPublicVehicleDetailBySlug(
  tenantId: string,
  slug: string,
): Promise<PublicVehicleDetailDto | null> {
  const db = getDb();
  await clearPublicSessionGucs(db);

  const [row] = await db
    .select(publicVehicleSelect)
    .from(vehicles)
    .where(
      and(
        eq(vehicles.tenantId, tenantId),
        eq(vehicles.slug, slug),
        eq(vehicles.status, "available"),
      ),
    )
    .limit(1);

  if (!row || row.tenantId !== tenantId || row.status !== "available") {
    return null;
  }

  const dto = toPublicVehicleDto(row);
  return attachPublicDetailImages(tenantId, dto, row.id);
}

export { filterPublicAlternativeRows } from "./public-vehicle-alternatives";

/**
 * Other available vehicles from the same tenant (for detail “Alte alternative”).
 * Excludes current slug; never cross-tenant.
 */
export async function listPublicVehicleAlternatives(
  tenantId: string,
  excludeSlug: string,
  limit = 10,
): Promise<PublicVehicleCatalogDto[]> {
  const safeLimit = Math.min(10, Math.max(0, Math.floor(limit)));
  if (safeLimit === 0 || !excludeSlug) return [];

  const db = getDb();
  await clearPublicSessionGucs(db);

  const rows = await db
    .select(publicCatalogVehicleSelect)
    .from(vehicles)
    .where(
      and(
        eq(vehicles.tenantId, tenantId),
        eq(vehicles.status, "available"),
        ne(vehicles.slug, excludeSlug),
      ),
    )
    .orderBy(desc(vehicles.createdAt), asc(vehicles.id))
    .limit(safeLimit);

  const filtered = filterPublicAlternativeRows(rows, tenantId, excludeSlug);

  return attachPublicCoverImages(
    tenantId,
    filtered.map((row) => ({
      vehicle: toPublicCatalogVehicleDto(row),
      vehicleId: row.id,
    })),
  );
}

/** Server-only: resolve vehicle id for lead attribution (never expose to client DTO). */
export async function getPublicVehicleIdForLead(
  tenantId: string,
  slug: string,
): Promise<string | null> {
  const db = getDb();
  await clearPublicSessionGucs(db);

  const [row] = await db
    .select({
      id: vehicles.id,
      tenantId: vehicles.tenantId,
      status: vehicles.status,
    })
    .from(vehicles)
    .where(
      and(
        eq(vehicles.tenantId, tenantId),
        eq(vehicles.slug, slug),
        eq(vehicles.status, "available"),
      ),
    )
    .limit(1);

  if (!row || row.tenantId !== tenantId || row.status !== "available") {
    return null;
  }
  return row.id;
}
