/**
 * VERCEL_DEMO_ONLY — temporary Hobby demo tenancy on a single apex Host.
 *
 * NOT for production. Local / real multi-tenant Host resolution stays unchanged.
 * Never reads tenant from query, path, cookie, body, or any client-controlled input.
 *
 * Active only when ALL gates pass (see isVercelDemoOnlyEnvironmentActive).
 */

import { tenantSlugSchema } from "@auto-platform/types";

export type VercelDemoOnlyEnvInput = {
  /** process.env.VERCEL — platform sets "1" on Vercel */
  vercel?: string | null;
  /** process.env.VERCEL_DEMO_ONLY — must be exactly "true" */
  vercelDemoOnly?: string | null;
  /** process.env.VERCEL_DEMO_TENANT_SLUG — server-only demo slug */
  vercelDemoTenantSlug?: string | null;
  /** process.env.VERCEL_DEMO_DISABLE_PUBLIC_LEADS — must be exactly "true" to disable */
  vercelDemoDisablePublicLeads?: string | null;
  /** process.env.VERCEL_URL — deployment host without protocol */
  vercelUrl?: string | null;
  /** process.env.VERCEL_PROJECT_PRODUCTION_URL — production alias host */
  vercelProjectProductionUrl?: string | null;
  /** Current request Host / x-forwarded-host */
  host: string;
  /** NEXT_PUBLIC_ROOT_DOMAIN — must be the Hobby apex (*.vercel.app), not a custom domain */
  rootDomain: string;
};

function normalizeHost(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "")
    .replace(/\.$/, "");
}

/**
 * Hobby / default Vercel hostname only — rejects custom domains and multi-level hosts.
 * Examples OK: proiect.vercel.app, proiect-git-main-team.vercel.app
 * Rejected: domeniu.ro, acme.domeniu.ro, foo.bar.vercel.app, localhost
 */
export function isVercelHobbyAppHostname(host: string): boolean {
  const h = normalizeHost(host);
  const suffix = ".vercel.app";
  if (!h.endsWith(suffix) || h === "vercel.app") {
    return false;
  }
  const label = h.slice(0, -suffix.length);
  return label.length > 0 && !label.includes(".");
}

function collectAllowedVercelDeploymentHosts(input: VercelDemoOnlyEnvInput): Set<string> {
  const allowed = new Set<string>();
  for (const raw of [input.vercelUrl, input.vercelProjectProductionUrl]) {
    if (!raw?.trim()) continue;
    const host = normalizeHost(raw);
    if (isVercelHobbyAppHostname(host)) {
      allowed.add(host);
    }
  }
  return allowed;
}

/**
 * Environment + Host gate for Hobby demo (does not require a valid tenant slug).
 * Fail-closed: any missing/invalid condition → false.
 */
export function isVercelDemoOnlyEnvironmentActive(input: VercelDemoOnlyEnvInput): boolean {
  if (input.vercel !== "1") {
    return false;
  }
  if (input.vercelDemoOnly !== "true") {
    return false;
  }

  const host = normalizeHost(input.host);
  const root = normalizeHost(input.rootDomain);

  if (!host || !root) {
    return false;
  }

  // Apex-only: ROOT_DOMAIN must equal Host (Hobby single URL), not a wildcard parent.
  if (host !== root) {
    return false;
  }

  // Reject real custom domains / non-Hobby apex.
  if (!isVercelHobbyAppHostname(host) || !isVercelHobbyAppHostname(root)) {
    return false;
  }

  const allowed = collectAllowedVercelDeploymentHosts(input);
  if (allowed.size === 0) {
    return false;
  }

  // Host must be exactly a configured Vercel deployment hostname — not an arbitrary Host header.
  if (!allowed.has(host)) {
    return false;
  }

  return true;
}

/**
 * Returns the server-configured demo tenant slug, or null when the gate is closed /
 * slug is missing / slug fails strict validation.
 * Never defaults to another tenant.
 */
export function resolveVercelDemoTenantSlug(input: VercelDemoOnlyEnvInput): string | null {
  if (!isVercelDemoOnlyEnvironmentActive(input)) {
    return null;
  }

  const raw = input.vercelDemoTenantSlug?.trim() ?? "";
  if (!raw) {
    return null;
  }

  const parsed = tenantSlugSchema.safeParse(raw);
  if (!parsed.success) {
    return null;
  }

  return parsed.data;
}

/**
 * When true, public lead create (UI + Server Action) must be disabled on this Hobby demo.
 * Local / production Host-based flows stay unchanged when flags are absent.
 */
export function isVercelDemoPublicLeadsDisabled(input: VercelDemoOnlyEnvInput): boolean {
  return (
    isVercelDemoOnlyEnvironmentActive(input) &&
    input.vercelDemoDisablePublicLeads === "true"
  );
}

/** Reads process.env for server call sites — never import from client components. */
export function readVercelDemoOnlyEnvFromProcess(host: string, rootDomain: string): VercelDemoOnlyEnvInput {
  return {
    vercel: process.env.VERCEL,
    vercelDemoOnly: process.env.VERCEL_DEMO_ONLY,
    vercelDemoTenantSlug: process.env.VERCEL_DEMO_TENANT_SLUG,
    vercelDemoDisablePublicLeads: process.env.VERCEL_DEMO_DISABLE_PUBLIC_LEADS,
    vercelUrl: process.env.VERCEL_URL,
    vercelProjectProductionUrl: process.env.VERCEL_PROJECT_PRODUCTION_URL,
    host,
    rootDomain,
  };
}

export function resolveVercelDemoTenantSlugFromRequest(
  host: string,
  rootDomain: string,
): string | null {
  return resolveVercelDemoTenantSlug(readVercelDemoOnlyEnvFromProcess(host, rootDomain));
}

export function isVercelDemoPublicLeadsDisabledFromRequest(
  host: string,
  rootDomain: string,
): boolean {
  return isVercelDemoPublicLeadsDisabled(readVercelDemoOnlyEnvFromProcess(host, rootDomain));
}
