import {
  vehicleBodyTypeSchema,
  vehicleFuelSchema,
  vehicleTransmissionSchema,
  type VehicleBodyType,
  type VehicleFuel,
  type VehicleTransmission,
} from "@auto-platform/types";

/** Fixed page size — never from client URL. */
export const CATALOG_PAGE_SIZE = 12 as const;

export const CATALOG_SORT_VALUES = [
  "newest",
  "price_asc",
  "price_desc",
  "year_desc",
  "mileage_asc",
] as const;
export type CatalogSort = (typeof CATALOG_SORT_VALUES)[number];

export const CATALOG_SORT_LABELS_RO: Record<CatalogSort, string> = {
  newest: "Cele mai noi",
  price_asc: "Preț crescător",
  price_desc: "Preț descrescător",
  year_desc: "An descrescător",
  mileage_asc: "Km crescător",
};

/** Forbidden client keys — never used for filtering. */
export const CATALOG_FORBIDDEN_PARAM_KEYS = [
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

export type CatalogQuery = {
  q: string | null;
  priceMin: number | null;
  priceMax: number | null;
  yearMin: number | null;
  yearMax: number | null;
  kmMin: number | null;
  kmMax: number | null;
  fuel: VehicleFuel[];
  transmission: VehicleTransmission[];
  bodyType: VehicleBodyType[];
  sort: CatalogSort;
  page: number;
};

export const DEFAULT_CATALOG_QUERY: CatalogQuery = {
  q: null,
  priceMin: null,
  priceMax: null,
  yearMin: null,
  yearMax: null,
  kmMin: null,
  kmMax: null,
  fuel: [],
  transmission: [],
  bodyType: [],
  sort: "newest",
  page: 1,
};

type SearchParamsLike =
  | URLSearchParams
  | Record<string, string | string[] | undefined>
  | null
  | undefined;

function getAll(params: SearchParamsLike, key: string): string[] {
  if (!params) return [];
  if (params instanceof URLSearchParams) {
    return params.getAll(key).map((v) => v.trim()).filter(Boolean);
  }
  const raw = params[key];
  if (raw === undefined) return [];
  if (Array.isArray(raw)) return raw.map((v) => String(v).trim()).filter(Boolean);
  const s = String(raw).trim();
  return s ? [s] : [];
}

function getOne(params: SearchParamsLike, key: string): string | null {
  const all = getAll(params, key);
  return all[0] ?? null;
}

function parseOptionalInt(
  raw: string | null,
  min: number,
  max: number,
): number | null {
  if (raw === null || raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return null;
  if (n < min || n > max) return null;
  return n;
}

function uniqueEnums<T extends string>(
  values: string[],
  parse: (v: string) => T | null,
  max: number,
): T[] {
  const out: T[] = [];
  const seen = new Set<T>();
  for (const value of values) {
    const parsed = parse(value);
    if (!parsed || seen.has(parsed)) continue;
    seen.add(parsed);
    out.push(parsed);
    if (out.length >= max) break;
  }
  return out;
}

function parseFuel(value: string): VehicleFuel | null {
  const r = vehicleFuelSchema.safeParse(value);
  return r.success ? r.data : null;
}

function parseTransmission(value: string): VehicleTransmission | null {
  const r = vehicleTransmissionSchema.safeParse(value);
  return r.success ? r.data : null;
}

function parseBodyType(value: string): VehicleBodyType | null {
  const r = vehicleBodyTypeSchema.safeParse(value);
  return r.success ? r.data : null;
}

function parseSort(raw: string | null): CatalogSort {
  if (raw && (CATALOG_SORT_VALUES as readonly string[]).includes(raw)) {
    return raw as CatalogSort;
  }
  return "newest";
}

function swapIfInverted(
  min: number | null,
  max: number | null,
): { min: number | null; max: number | null } {
  if (min !== null && max !== null && min > max) {
    return { min: max, max: min };
  }
  return { min, max };
}

function sanitizeQ(raw: string | null): string | null {
  if (!raw) return null;
  const cleaned = raw
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim()
    .slice(0, 80);
  return cleaned.length > 0 ? cleaned : null;
}

/**
 * Escapes `%`, `_`, `\` for PostgreSQL ILIKE patterns.
 */
export function escapeIlikePattern(input: string): string {
  return input.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/**
 * Parses catalog URL search params into a safe CatalogQuery.
 * Invalid values become defaults; forbidden keys are ignored.
 */
export function parseCatalogSearchParams(params: SearchParamsLike): CatalogQuery {
  const q = sanitizeQ(getOne(params, "q"));

  const price = swapIfInverted(
    parseOptionalInt(getOne(params, "priceMin"), 0, 2_000_000),
    parseOptionalInt(getOne(params, "priceMax"), 0, 2_000_000),
  );
  const year = swapIfInverted(
    parseOptionalInt(getOne(params, "yearMin"), 1950, 2100),
    parseOptionalInt(getOne(params, "yearMax"), 1950, 2100),
  );
  const km = swapIfInverted(
    parseOptionalInt(getOne(params, "kmMin"), 0, 2_000_000),
    parseOptionalInt(getOne(params, "kmMax"), 0, 2_000_000),
  );

  let page = parseOptionalInt(getOne(params, "page"), 1, 1_000_000) ?? 1;
  if (page < 1) page = 1;

  return {
    q,
    priceMin: price.min,
    priceMax: price.max,
    yearMin: year.min,
    yearMax: year.max,
    kmMin: km.min,
    kmMax: km.max,
    fuel: uniqueEnums(getAll(params, "fuel"), parseFuel, 8),
    transmission: uniqueEnums(getAll(params, "transmission"), parseTransmission, 5),
    bodyType: uniqueEnums(getAll(params, "bodyType"), parseBodyType, 10),
    sort: parseSort(getOne(params, "sort")),
    page,
  };
}

/** True when query has any user filter besides default sort/page=1. */
export function catalogQueryHasFilters(query: CatalogQuery): boolean {
  if (query.q) return true;
  if (query.priceMin !== null || query.priceMax !== null) return true;
  if (query.yearMin !== null || query.yearMax !== null) return true;
  if (query.kmMin !== null || query.kmMax !== null) return true;
  if (query.fuel.length > 0) return true;
  if (query.transmission.length > 0) return true;
  if (query.bodyType.length > 0) return true;
  if (query.sort !== "newest") return true;
  if (query.page > 1) return true;
  return false;
}

/**
 * Serializes CatalogQuery to shareable search params (omits defaults).
 * Never includes tenant_id, status, limit, pageSize.
 */
export function catalogQueryToSearchParams(query: CatalogQuery): URLSearchParams {
  const sp = new URLSearchParams();
  if (query.q) sp.set("q", query.q);
  if (query.priceMin !== null) sp.set("priceMin", String(query.priceMin));
  if (query.priceMax !== null) sp.set("priceMax", String(query.priceMax));
  if (query.yearMin !== null) sp.set("yearMin", String(query.yearMin));
  if (query.yearMax !== null) sp.set("yearMax", String(query.yearMax));
  if (query.kmMin !== null) sp.set("kmMin", String(query.kmMin));
  if (query.kmMax !== null) sp.set("kmMax", String(query.kmMax));
  for (const v of query.fuel) sp.append("fuel", v);
  for (const v of query.transmission) sp.append("transmission", v);
  for (const v of query.bodyType) sp.append("bodyType", v);
  if (query.sort !== "newest") sp.set("sort", query.sort);
  if (query.page > 1) sp.set("page", String(query.page));
  return sp;
}

export function buildCatalogHref(query: CatalogQuery): string {
  const sp = catalogQueryToSearchParams(query);
  const qs = sp.toString();
  return qs ? `/?${qs}` : "/";
}

export function clampCatalogPage(page: number, total: number): number {
  const totalPages = Math.max(1, Math.ceil(total / CATALOG_PAGE_SIZE));
  if (page < 1) return 1;
  if (page > totalPages) return totalPages;
  return page;
}
