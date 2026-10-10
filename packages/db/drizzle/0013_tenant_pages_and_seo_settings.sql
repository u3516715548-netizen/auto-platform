-- Etapa 23A: tenant CMS pages + SEO settings (basic).
-- No sitemap/robots/JSON-LD/OG/marketing in this migration.

CREATE TYPE "public"."tenant_page_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."tenant_page_kind" AS ENUM(
  'custom',
  'about',
  'contact',
  'terms',
  'privacy',
  'cookies'
);--> statement-breakpoint

CREATE TABLE "tenant_pages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "slug" text NOT NULL,
  "title" text NOT NULL,
  "body" text NOT NULL DEFAULT '',
  "status" "public"."tenant_page_status" DEFAULT 'draft' NOT NULL,
  "page_kind" "public"."tenant_page_kind" DEFAULT 'custom' NOT NULL,
  "locale" text DEFAULT 'ro' NOT NULL,
  "seo_title" text,
  "seo_description" text,
  "published_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "tenant_pages_tenant_id_tenants_id_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "tenant_pages_locale_check"
    CHECK ("locale" = 'ro'),
  CONSTRAINT "tenant_pages_slug_format_check"
    CHECK ("slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' AND char_length("slug") BETWEEN 2 AND 64),
  CONSTRAINT "tenant_pages_title_len_check"
    CHECK (char_length(btrim("title")) BETWEEN 1 AND 160),
  CONSTRAINT "tenant_pages_body_len_check"
    CHECK (char_length("body") <= 50000),
  CONSTRAINT "tenant_pages_seo_title_len_check"
    CHECK ("seo_title" IS NULL OR char_length(btrim("seo_title")) <= 70),
  CONSTRAINT "tenant_pages_seo_description_len_check"
    CHECK ("seo_description" IS NULL OR char_length(btrim("seo_description")) <= 160)
);--> statement-breakpoint

CREATE UNIQUE INDEX "tenant_pages_tenant_slug_uidx"
  ON "tenant_pages" USING btree ("tenant_id", "slug");--> statement-breakpoint
CREATE INDEX "tenant_pages_tenant_status_idx"
  ON "tenant_pages" USING btree ("tenant_id", "status");--> statement-breakpoint

ALTER TABLE "tenant_pages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tenant_pages" FORCE ROW LEVEL SECURITY;--> statement-breakpoint

-- Owner: full read (incl. draft).
CREATE POLICY tenant_pages_select_owner ON public.tenant_pages
  FOR SELECT
  USING (
    app.has_tenant_role(tenant_id, ARRAY['owner']::public.membership_role[])
  );--> statement-breakpoint

-- Members: published only.
CREATE POLICY tenant_pages_select_member_published ON public.tenant_pages
  FOR SELECT
  USING (
    app.has_tenant_access(tenant_id)
    AND status = 'published'
  );--> statement-breakpoint

-- Anon / public: published on active|trial tenants only.
CREATE POLICY tenant_pages_select_public_published ON public.tenant_pages
  FOR SELECT
  USING (
    status = 'published'
    AND app.current_profile_id() IS NULL
    AND EXISTS (
      SELECT 1 FROM public.tenants t
      WHERE t.id = tenant_id AND t.status IN ('active', 'trial')
    )
  );--> statement-breakpoint

CREATE POLICY tenant_pages_insert_owner ON public.tenant_pages
  FOR INSERT
  WITH CHECK (
    app.has_tenant_role(tenant_id, ARRAY['owner']::public.membership_role[])
    AND tenant_id = app.current_tenant_id()
  );--> statement-breakpoint

CREATE POLICY tenant_pages_update_owner ON public.tenant_pages
  FOR UPDATE
  USING (
    app.has_tenant_role(tenant_id, ARRAY['owner']::public.membership_role[])
  )
  WITH CHECK (
    app.has_tenant_role(tenant_id, ARRAY['owner']::public.membership_role[])
    AND tenant_id = app.current_tenant_id()
  );--> statement-breakpoint

CREATE POLICY tenant_pages_delete_owner ON public.tenant_pages
  FOR DELETE
  USING (
    app.has_tenant_role(tenant_id, ARRAY['owner']::public.membership_role[])
    AND tenant_id = app.current_tenant_id()
  );--> statement-breakpoint

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_pages TO authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    GRANT SELECT ON public.tenant_pages TO anon;
  END IF;
END $$;--> statement-breakpoint

-- SEO settings 1:1 (not on tenants — anon can SELECT full tenants rows).
CREATE TABLE "tenant_seo_settings" (
  "tenant_id" uuid PRIMARY KEY NOT NULL,
  "seo_title_default" text,
  "seo_description_default" text,
  "favicon_path" text,
  "indexing_enabled" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "tenant_seo_settings_tenant_id_tenants_id_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "tenant_seo_settings_title_len_check"
    CHECK ("seo_title_default" IS NULL OR char_length(btrim("seo_title_default")) <= 70),
  CONSTRAINT "tenant_seo_settings_description_len_check"
    CHECK ("seo_description_default" IS NULL OR char_length(btrim("seo_description_default")) <= 160)
);--> statement-breakpoint

ALTER TABLE "tenant_seo_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tenant_seo_settings" FORCE ROW LEVEL SECURITY;--> statement-breakpoint

CREATE POLICY tenant_seo_settings_select_member ON public.tenant_seo_settings
  FOR SELECT
  USING (app.has_tenant_access(tenant_id));--> statement-breakpoint

CREATE POLICY tenant_seo_settings_insert_owner ON public.tenant_seo_settings
  FOR INSERT
  WITH CHECK (
    app.has_tenant_role(tenant_id, ARRAY['owner']::public.membership_role[])
    AND tenant_id = app.current_tenant_id()
  );--> statement-breakpoint

CREATE POLICY tenant_seo_settings_update_owner ON public.tenant_seo_settings
  FOR UPDATE
  USING (
    app.has_tenant_role(tenant_id, ARRAY['owner']::public.membership_role[])
  )
  WITH CHECK (
    app.has_tenant_role(tenant_id, ARRAY['owner']::public.membership_role[])
    AND tenant_id = app.current_tenant_id()
  );--> statement-breakpoint

-- No anon row SELECT — public whitelist via SECURITY DEFINER.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    GRANT SELECT, INSERT, UPDATE ON public.tenant_seo_settings TO authenticated;
  END IF;
END $$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION app.public_seo_settings(p_tenant_id uuid)
RETURNS TABLE (
  seo_title_default text,
  seo_description_default text,
  favicon_path text,
  indexing_enabled boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  IF p_tenant_id IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = p_tenant_id AND t.status IN ('active', 'trial')
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    s.seo_title_default,
    s.seo_description_default,
    s.favicon_path,
    s.indexing_enabled
  FROM public.tenant_seo_settings s
  WHERE s.tenant_id = p_tenant_id;
END;
$$;--> statement-breakpoint

REVOKE ALL ON FUNCTION app.public_seo_settings(uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.public_seo_settings(uuid) TO anon, authenticated;
