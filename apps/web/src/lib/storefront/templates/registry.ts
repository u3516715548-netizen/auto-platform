import {
  DEFAULT_STOREFRONT_TEMPLATE_ID,
  storefrontTemplateIdSchema,
  type StorefrontTemplateId,
} from "@auto-platform/types";

export type StorefrontTemplateStatus = "ready" | "coming_soon";

/** CSS layouts that exist in globals.css today. */
export type StorefrontLayoutId = "template-1" | "template-2";

export type StorefrontTemplateDefinition = {
  id: string;
  labelRo: string;
  descriptionRo: string;
  status: StorefrontTemplateStatus;
  /** Interactive demo CSS layout. */
  layoutId: StorefrontLayoutId;
};

/**
 * Predefined storefront templates.
 * Only `ready` templates are selectable / accepted by tenantBrandingUpdateSchema.
 * Future entries may use `coming_soon` without being selectable.
 *
 * Template 1 = layout-ul public baseline (storefront-template-1).
 * Template 2 = aceeași structură, tokeni dark (storefront-template-2) — Etapa 24.
 */
export const STOREFRONT_TEMPLATE_REGISTRY: readonly StorefrontTemplateDefinition[] = [
  {
    id: DEFAULT_STOREFRONT_TEMPLATE_ID,
    labelRo: "Template 1",
    descriptionRo:
      "Layout-ul storefront activ: filtre, carduri catalog, Contact rapid — identic cu site-ul public.",
    status: "ready",
    layoutId: "template-1",
  },
  {
    id: "template-2",
    labelRo: "Template 2",
    descriptionRo:
      "Temă dark pe același layout. Previzualizarea folosește date demo. Activarea folosește datele reale ale dealerului.",
    status: "ready",
    layoutId: "template-2",
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

/** Templates shown in settings (ready + coming soon for preview). */
export function listPreviewableStorefrontTemplates(): StorefrontTemplateDefinition[] {
  return [...STOREFRONT_TEMPLATE_REGISTRY];
}

/**
 * Resolves any raw branding.templateId to a safe selectable id.
 * Missing / invalid / coming_soon → template-1.
 */
export function resolveStorefrontTemplateId(raw: unknown): StorefrontTemplateId {
  if (typeof raw === "string" && isStorefrontTemplateReady(raw)) {
    const parsed = storefrontTemplateIdSchema.safeParse(raw);
    if (parsed.success) return parsed.data;
  }
  return DEFAULT_STOREFRONT_TEMPLATE_ID;
}

/**
 * Parses a preview query param — only registry IDs (ready or coming_soon).
 * Unknown values fall back to template-1.
 */
export function resolvePreviewableTemplateId(raw: unknown): string {
  if (typeof raw !== "string") return DEFAULT_STOREFRONT_TEMPLATE_ID;
  const found = STOREFRONT_TEMPLATE_REGISTRY.find((t) => t.id === raw);
  return found?.id ?? DEFAULT_STOREFRONT_TEMPLATE_ID;
}

/** CSS class layout used by interactive demo / public shell. */
export function resolveStorefrontLayoutId(templateId: string): StorefrontLayoutId {
  const template = getStorefrontTemplate(templateId);
  return template.layoutId === "template-2" ? "template-2" : "template-1";
}

/** Preview route helper — path only; open with target=_blank from gallery. */
export function themePreviewPath(templateId: string): string {
  return `/dashboard/settings/customization/themes/preview?templateId=${encodeURIComponent(templateId)}`;
}
