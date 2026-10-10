import { desc, eq } from "drizzle-orm";
import { getDb, tenantPages, withTenantContext } from "@auto-platform/db";
import type { TenantPageListItem, TenantPageKind, TenantPageStatus } from "@auto-platform/types";
import type { MembershipSession } from "@/lib/auth/require-membership";

export async function listTenantPagesForSettings(
  session: MembershipSession,
): Promise<TenantPageListItem[]> {
  const tenantId = session.tenant.tenantId;
  const profileId = session.user.profile.id;

  const rows = await withTenantContext(
    getDb(),
    { profileId, tenantId },
    async (db) =>
      db
        .select({
          id: tenantPages.id,
          slug: tenantPages.slug,
          title: tenantPages.title,
          status: tenantPages.status,
          pageKind: tenantPages.pageKind,
          updatedAt: tenantPages.updatedAt,
          publishedAt: tenantPages.publishedAt,
        })
        .from(tenantPages)
        .where(eq(tenantPages.tenantId, tenantId))
        .orderBy(desc(tenantPages.updatedAt)),
  );

  return rows.map((row) => ({
    pageId: row.id,
    slug: row.slug,
    title: row.title,
    status: row.status as TenantPageStatus,
    pageKind: row.pageKind as TenantPageKind,
    updatedAt: row.updatedAt.toISOString(),
    ...(row.publishedAt ? { publishedAt: row.publishedAt.toISOString() } : {}),
  }));
}

export async function getTenantPageForSettings(
  session: MembershipSession,
  pageId: string,
): Promise<{
  pageId: string;
  slug: string;
  title: string;
  body: string;
  status: TenantPageStatus;
  pageKind: TenantPageKind;
  seoTitle: string | null;
  seoDescription: string | null;
} | null> {
  const tenantId = session.tenant.tenantId;
  const profileId = session.user.profile.id;

  const row = await withTenantContext(
    getDb(),
    { profileId, tenantId },
    async (db) =>
      db.query.tenantPages.findFirst({
        where: eq(tenantPages.id, pageId),
      }),
  );

  if (!row || row.tenantId !== tenantId) return null;

  return {
    pageId: row.id,
    slug: row.slug,
    title: row.title,
    body: row.body,
    status: row.status as TenantPageStatus,
    pageKind: row.pageKind as TenantPageKind,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
  };
}
