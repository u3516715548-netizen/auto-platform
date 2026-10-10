/**
 * Opt-in server timing for public storefront diagnostics (Stage 23A.1).
 *
 * Enable: `PERF_SERVER_TIMING=1` in the server environment (not committed).
 * Logs durations + non-PII labels only — never emails, phones, tokens, or signed URLs.
 * No client exposure; no UI; no external dependencies.
 */

export type PerfSpanName =
  | "middleware.total"
  | "middleware.getUser"
  | "tenant.resolve"
  | "catalog.vehicles"
  | "vehicle.detail"
  | "media.query"
  | "signedUrls"
  | "company.profile"
  | "seo.settings"
  | "ssr.route";

type PerfMetaValue = string | number | boolean | undefined;
type PerfMeta = Record<string, PerfMetaValue>;

const SAFE_META_KEYS = new Set([
  "route",
  "path",
  "kind",
  "count",
  "ok",
  "page",
  "status",
]);

export function isPerfServerTimingEnabled(): boolean {
  return process.env.PERF_SERVER_TIMING === "1";
}

function sanitizeMeta(meta?: PerfMeta): PerfMeta | undefined {
  if (!meta) return undefined;
  const out: PerfMeta = {};
  for (const [key, value] of Object.entries(meta)) {
    if (!SAFE_META_KEYS.has(key)) continue;
    if (value === undefined) continue;
    if (typeof value === "string") {
      // Bound length; never log raw query strings or URLs.
      out[key] = value.slice(0, 64);
      continue;
    }
    out[key] = value;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function logPerf(name: PerfSpanName, ms: number, meta?: PerfMeta): void {
  const rounded = Math.round(ms * 10) / 10;
  const safe = sanitizeMeta(meta);
  if (safe) {
    console.info(`[perf] ${name} ${rounded}ms`, safe);
  } else {
    console.info(`[perf] ${name} ${rounded}ms`);
  }
}

/** Time an async span when instrumentation is enabled; otherwise passthrough. */
export async function withPerfSpan<T>(
  name: PerfSpanName,
  fn: () => Promise<T>,
  meta?: PerfMeta,
): Promise<T> {
  if (!isPerfServerTimingEnabled()) {
    return fn();
  }
  const start = performance.now();
  try {
    return await fn();
  } finally {
    logPerf(name, performance.now() - start, meta);
  }
}

/** Time a full SSR page/handler when instrumentation is enabled. */
export async function withPerfRoute<T>(
  route: string,
  fn: () => Promise<T>,
): Promise<T> {
  return withPerfSpan("ssr.route", fn, { route });
}

export function logPerfDuration(
  name: PerfSpanName,
  startedAt: number,
  meta?: PerfMeta,
): void {
  if (!isPerfServerTimingEnabled()) return;
  logPerf(name, performance.now() - startedAt, meta);
}
