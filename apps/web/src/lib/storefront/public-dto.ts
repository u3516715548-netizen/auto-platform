import { primaryColorHexSchema } from "@auto-platform/types";

/**
 * Extracts a safe public primaryColor from tenants.branding jsonb.
 * Returns null when missing or invalid — never returns raw branding.
 */
export function parsePublicPrimaryColor(branding: unknown): string | null {
  if (!branding || typeof branding !== "object" || Array.isArray(branding)) {
    return null;
  }
  const raw = (branding as Record<string, unknown>).primaryColor;
  if (typeof raw !== "string") return null;
  const parsed = primaryColorHexSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/** Specs whitelist: only plain string/number/boolean values with safe keys. */
export function filterPublicSpecs(specs: unknown): Record<string, string | number | boolean> {
  if (!specs || typeof specs !== "object" || Array.isArray(specs)) {
    return {};
  }
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(specs as Record<string, unknown>)) {
    if (!/^[a-zA-Z][a-zA-Z0-9_-]{0,39}$/.test(key)) continue;
    if (typeof value === "string" && value.length <= 120) {
      out[key] = value;
    } else if (typeof value === "number" && Number.isFinite(value)) {
      out[key] = value;
    } else if (typeof value === "boolean") {
      out[key] = value;
    }
  }
  return out;
}
