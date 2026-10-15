-- Phase 6 — Content SEO / Landing Pages: extend tenant_pages (no new table).

ALTER TYPE "public"."tenant_page_status" ADD VALUE IF NOT EXISTS 'archived';--> statement-breakpoint

ALTER TYPE "public"."tenant_page_kind" ADD VALUE IF NOT EXISTS 'local_inventory';--> statement-breakpoint
ALTER TYPE "public"."tenant_page_kind" ADD VALUE IF NOT EXISTS 'brand_inventory';--> statement-breakpoint
ALTER TYPE "public"."tenant_page_kind" ADD VALUE IF NOT EXISTS 'body_type_inventory';--> statement-breakpoint
ALTER TYPE "public"."tenant_page_kind" ADD VALUE IF NOT EXISTS 'fuel_inventory';--> statement-breakpoint
ALTER TYPE "public"."tenant_page_kind" ADD VALUE IF NOT EXISTS 'financing';--> statement-breakpoint
ALTER TYPE "public"."tenant_page_kind" ADD VALUE IF NOT EXISTS 'buyback';--> statement-breakpoint
ALTER TYPE "public"."tenant_page_kind" ADD VALUE IF NOT EXISTS 'warranty';--> statement-breakpoint
ALTER TYPE "public"."tenant_page_kind" ADD VALUE IF NOT EXISTS 'service';--> statement-breakpoint

ALTER TABLE "tenant_pages"
  ADD COLUMN IF NOT EXISTS "h1" text,
  ADD COLUMN IF NOT EXISTS "intro" text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "cta_label" text,
  ADD COLUMN IF NOT EXISTS "cta_href" text,
  ADD COLUMN IF NOT EXISTS "og_image_path" text,
  ADD COLUMN IF NOT EXISTS "canonical_path" text,
  ADD COLUMN IF NOT EXISTS "noindex" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "include_in_sitemap" boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "faq" jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "catalog_filters" jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS "internal_links" jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "updated_by" uuid;--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tenant_pages_h1_len_check'
  ) THEN
    ALTER TABLE "tenant_pages"
      ADD CONSTRAINT "tenant_pages_h1_len_check"
      CHECK ("h1" IS NULL OR char_length(btrim("h1")) BETWEEN 1 AND 160);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tenant_pages_intro_len_check'
  ) THEN
    ALTER TABLE "tenant_pages"
      ADD CONSTRAINT "tenant_pages_intro_len_check"
      CHECK (char_length("intro") <= 2000);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tenant_pages_cta_label_len_check'
  ) THEN
    ALTER TABLE "tenant_pages"
      ADD CONSTRAINT "tenant_pages_cta_label_len_check"
      CHECK ("cta_label" IS NULL OR char_length(btrim("cta_label")) BETWEEN 1 AND 80);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tenant_pages_cta_href_format_check'
  ) THEN
    ALTER TABLE "tenant_pages"
      ADD CONSTRAINT "tenant_pages_cta_href_format_check"
      CHECK (
        "cta_href" IS NULL
        OR (
          "cta_href" ~ '^/(?:[a-z0-9]+(?:-[a-z0-9]+)*/?)*(?:#[a-z0-9_-]+)?$'
          AND char_length("cta_href") BETWEEN 1 AND 200
          AND position('://' in "cta_href") = 0
          AND position('..' in "cta_href") = 0
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tenant_pages_canonical_path_format_check'
  ) THEN
    ALTER TABLE "tenant_pages"
      ADD CONSTRAINT "tenant_pages_canonical_path_format_check"
      CHECK (
        "canonical_path" IS NULL
        OR (
          "canonical_path" ~ '^/(?:p|vehicles)/[a-z0-9]+(?:-[a-z0-9]+)*$'
          OR "canonical_path" = '/'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tenant_pages_og_image_path_len_check'
  ) THEN
    ALTER TABLE "tenant_pages"
      ADD CONSTRAINT "tenant_pages_og_image_path_len_check"
      CHECK ("og_image_path" IS NULL OR char_length(btrim("og_image_path")) BETWEEN 1 AND 500);
  END IF;
END $$;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "tenant_pages_tenant_sitemap_idx"
  ON "tenant_pages" USING btree ("tenant_id", "status", "noindex", "include_in_sitemap");
