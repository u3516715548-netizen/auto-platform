import {
  DEFAULT_STOREFRONT_TEMPLATE_ID,
  tenantBrandingUpdateSchema,
  type TenantBrandingUpdateInput,
} from "@auto-platform/types";

export const TENANT_BRANDING_MANAGED_KEYS = [
  "primaryColor",
  "templateId",
  "phone",
  "whatsapp",
  "leadNotificationEmails",
] as const;

export const BRANDING_UPDATE_ROLES = ["owner"] as const;

function brandingValueEqual(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) || Array.isArray(b)) {
    const left = Array.isArray(a) ? a : [];
    const right = Array.isArray(b) ? b : [];
    if (left.length !== right.length) return false;
    return left.every((item, index) => item === right[index]);
  }
  return (a ?? null) === (b ?? null);
}

/**
 * Merges managed branding fields into existing jsonb.
 * Preserves unmanaged historic keys; never injects client-unknown keys.
 * `phone` / `whatsapp` null clears those managed keys.
 * `leadNotificationEmails` always written (may be []).
 */
export function mergeTenantBranding(
  existing: unknown,
  update: TenantBrandingUpdateInput,
): Record<string, unknown> {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};

  for (const key of TENANT_BRANDING_MANAGED_KEYS) {
    delete base[key];
  }

  base.primaryColor = update.primaryColor;
  base.templateId = update.templateId;
  base.leadNotificationEmails = update.leadNotificationEmails;
  if (update.phone !== null) {
    base.phone = update.phone;
  }
  if (update.whatsapp !== null) {
    base.whatsapp = update.whatsapp;
  }

  return base;
}

/** Which managed keys changed (never includes phone/whatsapp/email values). */
export function listChangedBrandingKeys(
  before: unknown,
  after: Record<string, unknown>,
): string[] {
  const prev =
    before && typeof before === "object" && !Array.isArray(before)
      ? (before as Record<string, unknown>)
      : {};
  const changed: string[] = [];
  for (const key of TENANT_BRANDING_MANAGED_KEYS) {
    const a = prev[key] ?? (key === "leadNotificationEmails" ? [] : null);
    const b = after[key] ?? (key === "leadNotificationEmails" ? [] : null);
    if (!brandingValueEqual(a, b)) changed.push(key);
  }
  return changed;
}

export function parseBrandingUpdateForm(formData: FormData):
  | { ok: true; data: TenantBrandingUpdateInput }
  | { ok: false; error: string } {
  const phoneRaw = String(formData.get("phone") ?? "").trim();
  const whatsappRaw = String(formData.get("whatsapp") ?? "").trim();
  const notificationEmails = [
    String(formData.get("leadNotificationEmail1") ?? ""),
    String(formData.get("leadNotificationEmail2") ?? ""),
    String(formData.get("leadNotificationEmail3") ?? ""),
  ];

  const parsed = tenantBrandingUpdateSchema.safeParse({
    primaryColor: formData.get("primaryColor"),
    templateId: formData.get("templateId") || DEFAULT_STOREFRONT_TEMPLATE_ID,
    phone: phoneRaw === "" ? null : phoneRaw,
    whatsapp: whatsappRaw === "" ? null : whatsappRaw,
    leadNotificationEmails: notificationEmails,
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? "Date de branding invalide." };
  }
  return { ok: true, data: parsed.data };
}
