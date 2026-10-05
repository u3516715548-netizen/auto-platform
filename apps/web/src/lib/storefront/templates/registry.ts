import {
  DEFAULT_STOREFRONT_TEMPLATE_ID,
  type StorefrontTemplateId,
} from "@auto-platform/types";

export type StorefrontTemplateStatus = "ready" | "coming_soon";

export type StorefrontTemplateDefinition = {
  id: string;
  labelRo: string;
  status: StorefrontTemplateStatus;
};

/**
 * Predefined storefront templates.
 * Only `ready` templates are selectable / accepted by tenantBrandingUpdateSchema.
 * Future entries may use `coming_soon` without being selectable.
 */
export const STOREFRONT_TEMPLATE_REGISTRY: readonly StorefrontTemplateDefinition[] = [
  {
    id: DEFAULT_STOREFRONT_TEMPLATE_ID,
    labelRo: "Template 1",
    status: "ready",
  },
] as const;

export function getStorefrontTemplate(
  id: string | null | undefined,
): StorefrontTemplateDefinition {
  const found = STOREFRONT_TEMPLATE_REGISTRY.find((t) => t.id === id);
  if (found) return found;
  return STOREFRONT_TEMPLATE_REGISTRY.find(
    (t) => t.id === DEFAULT_STOREFRONT_TEMPLATE_ID,
  )!;
}

export function isStorefrontTemplateReady(id: string): boolean {
  const found = STOREFRONT_TEMPLATE_REGISTRY.find((t) => t.id === id);
  return found?.status === "ready";
}

/** Template IDs dealers may select (status === ready AND update allowlist). */
export function listSelectableStorefrontTemplates(): StorefrontTemplateDefinition[] {
  return STOREFRONT_TEMPLATE_REGISTRY.filter((t) => t.status === "ready");
}

/**
 * Resolves any raw branding.templateId to a safe selectable id.
 * Missing / invalid / coming_soon → template-1.
 */
export function resolveStorefrontTemplateId(raw: unknown): StorefrontTemplateId {
  if (typeof raw === "string" && isStorefrontTemplateReady(raw)) {
    // Only ready templates that are also on the Zod allowlist are returned as-is.
    if (raw === DEFAULT_STOREFRONT_TEMPLATE_ID) {
      return DEFAULT_STOREFRONT_TEMPLATE_ID;
    }
  }
  return DEFAULT_STOREFRONT_TEMPLATE_ID;
}
