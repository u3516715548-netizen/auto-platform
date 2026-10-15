"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { InsufficientRoleError } from "@auto-platform/core";
import { getDb, tenantPages, withTenantContext, writeAuditLog } from "@auto-platform/db";
import {
  createTenantPageInputSchema,
  KIND_TO_LEGAL_SLUG,
  tenantPageIdInputSchema,
  tenantPageKindSchema,
  updateTenantPageInputSchema,
  sanitizeLandingCatalogFilters,
  validateCmsPageForPublish,
} from "@auto-platform/types";
import { requireRole } from "@/lib/auth/require-role";
import { SETTINGS_OWNER_ROLES } from "@/lib/dashboard/settings-nav";
import { revalidatePublicStorefrontPaths } from "@/lib/perf/public-storefront-cache";
import { rejectTenantIdFromForm } from "@/lib/vehicles/parse-update-form";
import { countInventoryVehiclesForFilters } from "@/lib/cms/count-inventory-for-filters";
import { parseCmsPageFormFields } from "@/lib/cms/parse-cms-page-form";

export type TenantPageActionState = {
  error: string | null;
  success: boolean;
};

const NEUTRAL_ERROR = "Pagina nu a putut fi salvată. Încearcă din nou.";
const NEUTRAL_DENIED = "Rolul tău nu permite administrarea paginilor.";

async function requireOwner() {
  try {
    return await requireRole(SETTINGS_OWNER_ROLES);
  } catch (error) {
    if (error instanceof InsufficientRoleError) {
      return null;
    }
    throw error;
  }
}

function revalidateCms(tenantId: string, slug?: string) {
  revalidatePath("/dashboard/settings/customization/pages");
  revalidatePath("/dashboard/settings/customization/pages", "layout");
  if (slug) {
    revalidatePath(`/p/${slug}`);
  }
  revalidatePublicStorefrontPaths({ tenantId });
}

function extendedValues(input: {
  h1: string | null;
  intro: string;
  ctaLabel: string | null;
  ctaHref: string | null;
  ogImagePath: string | null;
  canonicalPath: string | null;
  noindex: boolean;
  includeInSitemap: boolean;
  faq: Array<{ question: string; answer: string }>;
  catalogFilters: Record<string, unknown>;
  internalLinks: Array<{ label: string; path: string }>;
}) {
  return {
    h1: input.h1,
    intro: input.intro,
    ctaLabel: input.ctaLabel,
    ctaHref: input.ctaHref,
    ogImagePath: input.ogImagePath,
    canonicalPath: input.canonicalPath,
    noindex: input.noindex,
    includeInSitemap: input.includeInSitemap,
    faq: input.faq,
    catalogFilters: input.catalogFilters,
    internalLinks: input.internalLinks,
  };
}

export async function createTenantPageAction(
  _prev: TenantPageActionState | null,
  formData: FormData,
): Promise<TenantPageActionState> {
  if (rejectTenantIdFromForm(formData)) {
    return { error: NEUTRAL_ERROR, success: false };
  }
  const session = await requireOwner();
  if (!session) return { error: NEUTRAL_DENIED, success: false };

  const fields = parseCmsPageFormFields(formData);
  const pageKindParsed = tenantPageKindSchema.safeParse(fields.pageKind);
  const pageKind = pageKindParsed.success ? pageKindParsed.data : "custom";
  const legalSlug = KIND_TO_LEGAL_SLUG[pageKind];
  const slug = legalSlug ?? fields.slug;

  const parsed = createTenantPageInputSchema.safeParse({
    ...fields,
    slug,
    pageKind,
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Date invalide.",
      success: false,
    };
  }

  const tenantId = session.tenant.tenantId;
  const profileId = session.user.profile.id;
  const input = parsed.data;

  try {
    await withTenantContext(getDb(), { profileId, tenantId }, async (db) => {
      const clash = await db.query.tenantPages.findFirst({
        where: and(eq(tenantPages.tenantId, tenantId), eq(tenantPages.slug, input.slug)),
        columns: { id: true },
      });
      if (clash) {
        throw new Error("SLUG_TAKEN");
      }

      const [created] = await db
        .insert(tenantPages)
        .values({
          tenantId,
          slug: input.slug,
          title: input.title,
          body: input.body,
          pageKind: input.pageKind,
          status: "draft",
          locale: "ro",
          seoTitle: input.seoTitle,
          seoDescription: input.seoDescription,
          ...extendedValues(input),
          updatedBy: profileId,
        })
        .returning({ id: tenantPages.id });

      await writeAuditLog(db, {
        tenantId,
        actorProfileId: profileId,
        action: "cms.page.create",
        entityType: "tenant_page",
        entityId: created!.id,
        metadata: {
          slug: input.slug,
          pageKind: input.pageKind,
          status: "draft",
        },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "SLUG_TAKEN") {
      return { error: "Slug-ul este deja folosit.", success: false };
    }
    return { error: NEUTRAL_ERROR, success: false };
  }

  revalidateCms(tenantId, input.slug);
  return { error: null, success: true };
}

export async function updateTenantPageAction(
  _prev: TenantPageActionState | null,
  formData: FormData,
): Promise<TenantPageActionState> {
  if (rejectTenantIdFromForm(formData)) {
    return { error: NEUTRAL_ERROR, success: false };
  }
  const session = await requireOwner();
  if (!session) return { error: NEUTRAL_DENIED, success: false };

  const fields = parseCmsPageFormFields(formData);
  const parsed = updateTenantPageInputSchema.safeParse({
    pageId: String(formData.get("pageId") ?? ""),
    ...fields,
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Date invalide.",
      success: false,
    };
  }

  const tenantId = session.tenant.tenantId;
  const profileId = session.user.profile.id;
  const input = parsed.data;

  try {
    await withTenantContext(getDb(), { profileId, tenantId }, async (db) => {
      const existing = await db.query.tenantPages.findFirst({
        where: and(eq(tenantPages.id, input.pageId), eq(tenantPages.tenantId, tenantId)),
      });
      if (!existing) throw new Error("NOT_FOUND");

      const clash = await db.query.tenantPages.findFirst({
        where: and(
          eq(tenantPages.tenantId, tenantId),
          eq(tenantPages.slug, input.slug),
          ne(tenantPages.id, input.pageId),
        ),
        columns: { id: true },
      });
      if (clash) throw new Error("SLUG_TAKEN");

      await db
        .update(tenantPages)
        .set({
          title: input.title,
          slug: input.slug,
          body: input.body,
          pageKind: input.pageKind,
          seoTitle: input.seoTitle,
          seoDescription: input.seoDescription,
          ...extendedValues(input),
          updatedBy: profileId,
          updatedAt: new Date(),
        })
        .where(and(eq(tenantPages.id, input.pageId), eq(tenantPages.tenantId, tenantId)));

      await writeAuditLog(db, {
        tenantId,
        actorProfileId: profileId,
        action: "cms.page.update",
        entityType: "tenant_page",
        entityId: input.pageId,
        metadata: {
          slug: input.slug,
          pageKind: input.pageKind,
        },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "SLUG_TAKEN") {
      return { error: "Slug-ul este deja folosit.", success: false };
    }
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return { error: "Pagina nu a fost găsită.", success: false };
    }
    return { error: NEUTRAL_ERROR, success: false };
  }

  revalidateCms(tenantId, input.slug);
  return { error: null, success: true };
}

export async function publishTenantPageAction(
  _prev: TenantPageActionState | null,
  formData: FormData,
): Promise<TenantPageActionState> {
  return setPageStatus(formData, "published");
}

export async function unpublishTenantPageAction(
  _prev: TenantPageActionState | null,
  formData: FormData,
): Promise<TenantPageActionState> {
  return setPageStatus(formData, "draft");
}

export async function archiveTenantPageAction(
  _prev: TenantPageActionState | null,
  formData: FormData,
): Promise<TenantPageActionState> {
  return setPageStatus(formData, "archived");
}

async function setPageStatus(
  formData: FormData,
  status: "draft" | "published" | "archived",
): Promise<TenantPageActionState> {
  if (rejectTenantIdFromForm(formData)) {
    return { error: NEUTRAL_ERROR, success: false };
  }
  const session = await requireOwner();
  if (!session) return { error: NEUTRAL_DENIED, success: false };

  const parsed = tenantPageIdInputSchema.safeParse({
    pageId: String(formData.get("pageId") ?? ""),
  });
  if (!parsed.success) {
    return { error: "Pagină invalidă.", success: false };
  }

  const tenantId = session.tenant.tenantId;
  const profileId = session.user.profile.id;
  let slug = "";

  try {
    await withTenantContext(getDb(), { profileId, tenantId }, async (db) => {
      const existing = await db.query.tenantPages.findFirst({
        where: and(eq(tenantPages.id, parsed.data.pageId), eq(tenantPages.tenantId, tenantId)),
      });
      if (!existing) throw new Error("NOT_FOUND");
      slug = existing.slug;

      if (status === "published") {
        const catalogFilters = sanitizeLandingCatalogFilters(existing.catalogFilters) ?? {};
        const inventoryVehicleCount = await countInventoryVehiclesForFilters(
          tenantId,
          existing.pageKind,
          catalogFilters,
        );
        const gate = validateCmsPageForPublish({
          title: existing.title,
          h1: existing.h1,
          intro: existing.intro,
          body: existing.body,
          seoDescription: existing.seoDescription,
          pageKind: existing.pageKind,
          catalogFilters,
          inventoryVehicleCount,
          faq: Array.isArray(existing.faq)
            ? (existing.faq as Array<{ question: string; answer: string }>)
            : [],
          ctaLabel: existing.ctaLabel,
          ctaHref: existing.ctaHref,
        });
        if (gate) {
          throw new Error(`PUBLISH_GATE:${gate}`);
        }
      }

      const now = new Date();
      await db
        .update(tenantPages)
        .set({
          status,
          publishedAt:
            status === "published" ? (existing.publishedAt ?? now) : existing.publishedAt,
          updatedBy: profileId,
          updatedAt: now,
        })
        .where(and(eq(tenantPages.id, parsed.data.pageId), eq(tenantPages.tenantId, tenantId)));

      await writeAuditLog(db, {
        tenantId,
        actorProfileId: profileId,
        action:
          status === "published"
            ? "cms.page.publish"
            : status === "archived"
              ? "cms.page.archive"
              : "cms.page.unpublish",
        entityType: "tenant_page",
        entityId: parsed.data.pageId,
        metadata: { slug, status },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("PUBLISH_GATE:")) {
      return { error: error.message.slice("PUBLISH_GATE:".length), success: false };
    }
    return { error: NEUTRAL_ERROR, success: false };
  }

  revalidateCms(tenantId, slug);
  return { error: null, success: true };
}

export async function deleteTenantPageAction(
  _prev: TenantPageActionState | null,
  formData: FormData,
): Promise<TenantPageActionState> {
  if (rejectTenantIdFromForm(formData)) {
    return { error: NEUTRAL_ERROR, success: false };
  }
  const session = await requireOwner();
  if (!session) return { error: NEUTRAL_DENIED, success: false };

  const parsed = tenantPageIdInputSchema.safeParse({
    pageId: String(formData.get("pageId") ?? ""),
  });
  if (!parsed.success) {
    return { error: "Pagină invalidă.", success: false };
  }

  const tenantId = session.tenant.tenantId;
  const profileId = session.user.profile.id;
  let slug = "";

  try {
    await withTenantContext(getDb(), { profileId, tenantId }, async (db) => {
      const existing = await db.query.tenantPages.findFirst({
        where: and(eq(tenantPages.id, parsed.data.pageId), eq(tenantPages.tenantId, tenantId)),
        columns: { id: true, slug: true },
      });
      if (!existing) throw new Error("NOT_FOUND");
      slug = existing.slug;

      await db
        .delete(tenantPages)
        .where(and(eq(tenantPages.id, parsed.data.pageId), eq(tenantPages.tenantId, tenantId)));

      await writeAuditLog(db, {
        tenantId,
        actorProfileId: profileId,
        action: "cms.page.delete",
        entityType: "tenant_page",
        entityId: parsed.data.pageId,
        metadata: { slug },
      });
    });
  } catch {
    return { error: NEUTRAL_ERROR, success: false };
  }

  revalidateCms(tenantId, slug);
  return { error: null, success: true };
}
