/**
 * Self-serve commercial plan helpers (Etapa 26B).
 * Limits come from marketing catalog — do not hardcode in UI components.
 */

import {
  getCommercialPlan,
  type CommercialPlanCode,
} from "@/lib/marketing/commercial-plans";

export const SELF_SERVE_PLAN_CODES = ["plan_50", "business", "premium"] as const;
export type SelfServePlanCode = (typeof SELF_SERVE_PLAN_CODES)[number];

const RESERVED_TENANT_SLUGS = new Set([
  "www",
  "api",
  "admin",
  "app",
  "mail",
  "ftp",
  "localhost",
  "acme",
  "beta",
  "static",
  "assets",
  "cdn",
  "status",
  "login",
  "logout",
  "signup",
  "register",
  "checkout",
  "preturi",
  "dashboard",
  "invite",
  "onboarding",
  "billing",
  "webhook",
  "support",
  "help",
  "docs",
  "blog",
  "null",
  "undefined",
]);

export function isSelfServePlanCode(code: string): code is SelfServePlanCode {
  return (SELF_SERVE_PLAN_CODES as readonly string[]).includes(code);
}

export function parseSelfServePlanCode(
  raw: string | null | undefined,
): SelfServePlanCode | null {
  if (!raw) return null;
  const code = raw.trim().toLowerCase();
  return isSelfServePlanCode(code) ? code : null;
}

export function maxPublishedForPlan(code: CommercialPlanCode): number | null {
  return getCommercialPlan(code).maxPublishedVehicles;
}

/** Slug: 2–48 chars, lowercase alphanumeric + hyphen, no leading/trailing hyphen. */
export function normalizeTenantSlug(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidTenantSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]{0,46}[a-z0-9]$/.test(slug);
}

export function isReservedTenantSlug(slug: string): boolean {
  return RESERVED_TENANT_SLUGS.has(normalizeTenantSlug(slug));
}

export function checkoutPath(plan: SelfServePlanCode): string {
  return `/checkout?plan=${encodeURIComponent(plan)}`;
}

export function loginWithPlanPath(plan: SelfServePlanCode): string {
  return `/login?plan=${encodeURIComponent(plan)}`;
}
