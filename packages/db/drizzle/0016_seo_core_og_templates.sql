-- Phase 2 SEO Core: OG defaults, title template, Twitter handle.
-- Extends tenant_seo_settings + public whitelist (SECURITY DEFINER).
-- No tracking / consent / custom scripts in this migration.

ALTER TABLE "tenant_seo_settings"
  ADD COLUMN IF NOT EXISTS "title_template" text,
  ADD COLUMN IF NOT EXISTS "og_image_path" text,
  ADD COLUMN IF NOT EXISTS "twitter_handle" text;--> statement-breakpoint

ALTER TABLE "tenant_seo_settings"
  DROP CONSTRAINT IF EXISTS "tenant_seo_settings_title_template_len_check";--> statement-breakpoint
ALTER TABLE "tenant_seo_settings"
  ADD CONSTRAINT "tenant_seo_settings_title_template_len_check"
  CHECK (
    "title_template" IS NULL
    OR (
      char_length(btrim("title_template")) BETWEEN 1 AND 80
      AND position('%s' in "title_template") > 0
    )
  );--> statement-breakpoint

ALTER TABLE "tenant_seo_settings"
  DROP CONSTRAINT IF EXISTS "tenant_seo_settings_twitter_handle_check";--> statement-breakpoint
ALTER TABLE "tenant_seo_settings"
  ADD CONSTRAINT "tenant_seo_settings_twitter_handle_check"
  CHECK (
    "twitter_handle" IS NULL
    OR "twitter_handle" ~ '^[A-Za-z0-9_]{1,15}$'
  );--> statement-breakpoint

-- Postgres cannot change OUT/return row type via CREATE OR REPLACE.
DROP FUNCTION IF EXISTS app.public_seo_settings(uuid);--> statement-breakpoint

CREATE FUNCTION app.public_seo_settings(p_tenant_id uuid)
RETURNS TABLE (
  seo_title_default text,
  seo_description_default text,
  favicon_path text,
  indexing_enabled boolean,
  title_template text,
  og_image_path text,
  twitter_handle text
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
    s.indexing_enabled,
    s.title_template,
    s.og_image_path,
    s.twitter_handle
  FROM public.tenant_seo_settings s
  WHERE s.tenant_id = p_tenant_id;
END;
$$;--> statement-breakpoint

REVOKE ALL ON FUNCTION app.public_seo_settings(uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.public_seo_settings(uuid) TO anon, authenticated;
