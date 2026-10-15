-- Phase 4: public whitelist for marketing IDs + verification (SECURITY DEFINER).
-- Table remains owner-only RLS; anon never SELECTs the row directly.
-- Runtime script loading is gated client-side by consent — this only exposes configured IDs.

CREATE OR REPLACE FUNCTION app.public_marketing_integrations(p_tenant_id uuid)
RETURNS TABLE (
  gtm_container_id text,
  gtm_enabled boolean,
  ga4_measurement_id text,
  ga4_enabled boolean,
  google_ads_conversion_id text,
  google_ads_conversion_label text,
  google_ads_enabled boolean,
  meta_pixel_id text,
  meta_pixel_enabled boolean,
  tiktok_pixel_id text,
  tiktok_pixel_enabled boolean,
  linkedin_partner_id text,
  linkedin_enabled boolean,
  google_search_console_verification text,
  bing_webmaster_verification text,
  meta_domain_verification text,
  pinterest_verification text
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
    m.gtm_container_id,
    m.gtm_enabled,
    m.ga4_measurement_id,
    m.ga4_enabled,
    m.google_ads_conversion_id,
    m.google_ads_conversion_label,
    m.google_ads_enabled,
    m.meta_pixel_id,
    m.meta_pixel_enabled,
    m.tiktok_pixel_id,
    m.tiktok_pixel_enabled,
    m.linkedin_partner_id,
    m.linkedin_enabled,
    m.google_search_console_verification,
    m.bing_webmaster_verification,
    m.meta_domain_verification,
    m.pinterest_verification
  FROM public.tenant_marketing_integrations m
  WHERE m.tenant_id = p_tenant_id;
END;
$$;--> statement-breakpoint

REVOKE ALL ON FUNCTION app.public_marketing_integrations(uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.public_marketing_integrations(uuid) TO anon, authenticated;
