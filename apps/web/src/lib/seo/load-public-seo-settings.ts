import { sql } from "drizzle-orm";
import { cache } from "react";
import { getDb } from "@auto-platform/db";
import type { PublicSeoSettingsView } from "@auto-platform/types";
import { withPerfSpan } from "@/lib/perf/server-timing";
import { clearPublicSessionGucs } from "@/lib/storefront/clear-public-session";

type SeoRow = {
  seo_title_default: string | null;
  seo_description_default: string | null;
  favicon_path: string | null;
  indexing_enabled: boolean;
};

/**
 * Public SEO whitelist via SECURITY DEFINER — never full-row anon SELECT.
 */
export const loadPublicSeoSettings = cache(
  async (tenantId: string): Promise<PublicSeoSettingsView> => {
    return withPerfSpan("seo.settings", async () => {
      const db = getDb();
      await clearPublicSessionGucs(db);

      const rows = await db.execute<SeoRow>(sql`
        select * from app.public_seo_settings(${tenantId}::uuid)
      `);
      const list = Array.from(rows as unknown as SeoRow[]);
      const row = list[0];
      if (!row) {
        return { indexingEnabled: true };
      }
      return {
        ...(row.seo_title_default ? { seoTitleDefault: row.seo_title_default } : {}),
        ...(row.seo_description_default
          ? { seoDescriptionDefault: row.seo_description_default }
          : {}),
        ...(row.favicon_path ? { faviconPath: row.favicon_path } : {}),
        indexingEnabled: row.indexing_enabled !== false,
      };
    });
  },
);
