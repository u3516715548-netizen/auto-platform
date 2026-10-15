-- Phase 3: Marketing Settings Center — tracking/verification IDs per tenant.
-- Owner-only RLS. No anon SELECT. No public SECURITY DEFINER whitelist.
-- Runtime script loading is intentionally NOT in this migration (Consent Phase later).

CREATE TABLE "tenant_marketing_integrations" (
  "tenant_id" uuid PRIMARY KEY NOT NULL,
  "gtm_container_id" text,
  "gtm_enabled" boolean DEFAULT true NOT NULL,
  "ga4_measurement_id" text,
  "ga4_enabled" boolean DEFAULT true NOT NULL,
  "google_ads_conversion_id" text,
  "google_ads_conversion_label" text,
  "google_ads_enabled" boolean DEFAULT true NOT NULL,
  "meta_pixel_id" text,
  "meta_pixel_enabled" boolean DEFAULT true NOT NULL,
  "tiktok_pixel_id" text,
  "tiktok_pixel_enabled" boolean DEFAULT true NOT NULL,
  "linkedin_partner_id" text,
  "linkedin_enabled" boolean DEFAULT true NOT NULL,
  "google_search_console_verification" text,
  "bing_webmaster_verification" text,
  "meta_domain_verification" text,
  "pinterest_verification" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "tenant_marketing_integrations_tenant_id_tenants_id_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "tenant_marketing_integrations_gtm_len_check"
    CHECK ("gtm_container_id" IS NULL OR char_length(btrim("gtm_container_id")) BETWEEN 1 AND 32),
  CONSTRAINT "tenant_marketing_integrations_ga4_len_check"
    CHECK ("ga4_measurement_id" IS NULL OR char_length(btrim("ga4_measurement_id")) BETWEEN 1 AND 32),
  CONSTRAINT "tenant_marketing_integrations_ads_id_len_check"
    CHECK ("google_ads_conversion_id" IS NULL OR char_length(btrim("google_ads_conversion_id")) BETWEEN 1 AND 32),
  CONSTRAINT "tenant_marketing_integrations_ads_label_len_check"
    CHECK ("google_ads_conversion_label" IS NULL OR char_length(btrim("google_ads_conversion_label")) BETWEEN 1 AND 64),
  CONSTRAINT "tenant_marketing_integrations_meta_pixel_len_check"
    CHECK ("meta_pixel_id" IS NULL OR char_length(btrim("meta_pixel_id")) BETWEEN 1 AND 32),
  CONSTRAINT "tenant_marketing_integrations_tiktok_len_check"
    CHECK ("tiktok_pixel_id" IS NULL OR char_length(btrim("tiktok_pixel_id")) BETWEEN 1 AND 64),
  CONSTRAINT "tenant_marketing_integrations_linkedin_len_check"
    CHECK ("linkedin_partner_id" IS NULL OR char_length(btrim("linkedin_partner_id")) BETWEEN 1 AND 32),
  CONSTRAINT "tenant_marketing_integrations_gsc_len_check"
    CHECK ("google_search_console_verification" IS NULL OR char_length(btrim("google_search_console_verification")) BETWEEN 1 AND 200),
  CONSTRAINT "tenant_marketing_integrations_bing_len_check"
    CHECK ("bing_webmaster_verification" IS NULL OR char_length(btrim("bing_webmaster_verification")) BETWEEN 1 AND 200),
  CONSTRAINT "tenant_marketing_integrations_meta_domain_len_check"
    CHECK ("meta_domain_verification" IS NULL OR char_length(btrim("meta_domain_verification")) BETWEEN 1 AND 200),
  CONSTRAINT "tenant_marketing_integrations_pinterest_len_check"
    CHECK ("pinterest_verification" IS NULL OR char_length(btrim("pinterest_verification")) BETWEEN 1 AND 200)
);--> statement-breakpoint

ALTER TABLE "tenant_marketing_integrations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tenant_marketing_integrations" FORCE ROW LEVEL SECURITY;--> statement-breakpoint

-- Owner-only read (stricter than SEO member SELECT — marketing IDs are sensitive).
CREATE POLICY tenant_marketing_integrations_select_owner ON public.tenant_marketing_integrations
  FOR SELECT
  USING (
    app.has_tenant_role(tenant_id, ARRAY['owner']::public.membership_role[])
  );--> statement-breakpoint

CREATE POLICY tenant_marketing_integrations_insert_owner ON public.tenant_marketing_integrations
  FOR INSERT
  WITH CHECK (
    app.has_tenant_role(tenant_id, ARRAY['owner']::public.membership_role[])
    AND tenant_id = app.current_tenant_id()
  );--> statement-breakpoint

CREATE POLICY tenant_marketing_integrations_update_owner ON public.tenant_marketing_integrations
  FOR UPDATE
  USING (
    app.has_tenant_role(tenant_id, ARRAY['owner']::public.membership_role[])
  )
  WITH CHECK (
    app.has_tenant_role(tenant_id, ARRAY['owner']::public.membership_role[])
    AND tenant_id = app.current_tenant_id()
  );--> statement-breakpoint

CREATE POLICY tenant_marketing_integrations_delete_owner ON public.tenant_marketing_integrations
  FOR DELETE
  USING (
    app.has_tenant_role(tenant_id, ARRAY['owner']::public.membership_role[])
    AND tenant_id = app.current_tenant_id()
  );--> statement-breakpoint

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_marketing_integrations TO authenticated;
  END IF;
  -- Explicitly no GRANT to anon.
END $$;
