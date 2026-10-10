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
} from "@auto-platform/types";
import { requireRole } from "@/lib/auth/require-role";
import { SETTINGS_OWNER_ROLES } from "@/lib/dashboard/settings-nav";
import { rejectTenantIdFromForm } from "@/lib/vehicles/parse-update-form";

export type TenantPageActionState = {
  error: string | null;
  success: boolean;
};

const NEUTRAL_ERROR = "Pagina nu a putut fi salvată. Încearcă din nou.";
const NEUTRAL_DENIED = "Rolul tău nu permite administrarea paginilor.";

function formString(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "");
}

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

function revalidateCms(slug?: string) {
  revalidatePath("/dashboard/settings/customization/pages");
  revalidatePath("/dashboard/settings/customization/pages", "layout");
  if (slug) {
    revalidatePath(`/p/${slug}`);
  }
  revalidatePath("/");
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

  const pageKindParsed = tenantPageKindSchema.safeParse(
    formString(formData, "pageKind") || "custom",
  );
  const pageKind = pageKindParsed.success ? pageKindParsed.data : "custom";
  const legalSlug = KIND_TO_LEGAL_SLUG[pageKind];
  const slug =
    pageKind !== "custom" && legalSlug
      ? legalSlug
      : formString(formData, "slug");

  const parsed = createTenantPageInputSchema.safeParse({
    title: formString(formData, "title"),
    slug,
    body: formString(formData, "body"),
    pageKind,
    seoTitle: formString(formData, "seoTitle"),
    seoDescription: formString(formData, "seoDescription"),
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

  revalidateCms(input.slug);
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

  const parsed = updateTenantPageInputSchema.safeParse({
    pageId: formString(formData, "pageId"),
    title: formString(formData, "title"),
    slug: formString(formData, "slug"),
    body: formString(formData, "body"),
    pageKind: formString(formData, "pageKind") || "custom",
    seoTitle: formString(formData, "seoTitle"),
    seoDescription: formString(formData, "seoDescription"),
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
          changedKeys: ["title", "slug", "body", "seoTitle", "seoDescription", "pageKind"],
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

  revalidateCms(input.slug);
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

async function setPageStatus(
  formData: FormData,
  status: "draft" | "published",
): Promise<TenantPageActionState> {
  if (rejectTenantIdFromForm(formData)) {
    return { error: NEUTRAL_ERROR, success: false };
  }
  const session = await requireOwner();
  if (!session) return { error: NEUTRAL_DENIED, success: false };

  const parsed = tenantPageIdInputSchema.safeParse({
    pageId: formString(formData, "pageId"),
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

      const now = new Date();
      await db
        .update(tenantPages)
        .set({
          status,
          publishedAt: status === "published" ? (existing.publishedAt ?? now) : existing.publishedAt,
          updatedAt: now,
        })
        .where(and(eq(tenantPages.id, parsed.data.pageId), eq(tenantPages.tenantId, tenantId)));

      await writeAuditLog(db, {
        tenantId,
        actorProfileId: profileId,
        action: status === "published" ? "cms.page.publish" : "cms.page.unpublish",
        entityType: "tenant_page",
        entityId: parsed.data.pageId,
        metadata: { slug, status },
      });
    });
  } catch {
    return { error: NEUTRAL_ERROR, success: false };
  }

  revalidateCms(slug);
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
    pageId: formString(formData, "pageId"),
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

  revalidateCms(slug);
  return { error: null, success: true };
}
