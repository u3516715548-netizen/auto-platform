-- Etapa 22: tenant company profiles (1:1) — legal/contact identity.
-- Sensitive fiscal fields live here (not in tenants.branding jsonb).
-- No anon SELECT on the full row; public projection via app.public_company_profile.

CREATE TYPE "public"."company_entity_type" AS ENUM(
  'srl',
  'sa',
  'pfa',
  'ii',
  'other'
);--> statement-breakpoint

CREATE TABLE "tenant_company_profiles" (
  "tenant_id" uuid PRIMARY KEY NOT NULL,
  "legal_name" text,
  "trading_name" text,
  "tax_id" text,
  "registration_number" text,
  "entity_type" "public"."company_entity_type",
  "public_email" text,
  "public_phone" text,
  "website" text,
  "registered_address" text,
  "showroom_address" text,
  "city" text,
  "county" text,
  "country" text DEFAULT 'RO',
  "postal_code" text,
  "business_hours" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "logo_path" text,
  "favicon_path" text,
  "currency" text DEFAULT 'EUR' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "tenant_company_profiles_tenant_id_tenants_id_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "tenant_company_profiles_currency_check"
    CHECK ("currency" IN ('EUR', 'RON')),
  CONSTRAINT "tenant_company_profiles_country_check"
    CHECK ("country" IS NULL OR "country" ~ '^[A-Z]{2}$'),
  CONSTRAINT "tenant_company_profiles_tax_id_digits_check"
    CHECK ("tax_id" IS NULL OR "tax_id" ~ '^\d{2,10}$'),
  CONSTRAINT "tenant_company_profiles_email_lower_check"
    CHECK ("public_email" IS NULL OR "public_email" = lower(btrim("public_email")))
);--> statement-breakpoint

CREATE INDEX "tenant_company_profiles_city_idx"
  ON "tenant_company_profiles" USING btree ("city");--> statement-breakpoint

ALTER TABLE "tenant_company_profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tenant_company_profiles" FORCE ROW LEVEL SECURITY;--> statement-breakpoint

-- Members may read their tenant's company profile (dashboard / staff).
CREATE POLICY tenant_company_profiles_select_member ON public.tenant_company_profiles
  FOR SELECT
  USING (app.has_tenant_access(tenant_id));--> statement-breakpoint

-- Owner-only insert/update (upsert path).
CREATE POLICY tenant_company_profiles_insert_owner ON public.tenant_company_profiles
  FOR INSERT
  WITH CHECK (
    app.has_tenant_role(tenant_id, ARRAY['owner']::public.membership_role[])
    AND tenant_id = app.current_tenant_id()
  );--> statement-breakpoint

CREATE POLICY tenant_company_profiles_update_owner ON public.tenant_company_profiles
  FOR UPDATE
  USING (
    app.has_tenant_role(tenant_id, ARRAY['owner']::public.membership_role[])
  )
  WITH CHECK (
    app.has_tenant_role(tenant_id, ARRAY['owner']::public.membership_role[])
    AND tenant_id = app.current_tenant_id()
  );--> statement-breakpoint

-- No DELETE policy (immutable history preference; cascade from tenant).
-- No anon SELECT policy — full row never public.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    GRANT SELECT, INSERT, UPDATE ON public.tenant_company_profiles TO authenticated;
  END IF;
END $$;--> statement-breakpoint

-- Narrow public projection (no secrets, no IBAN). Callable by anon/authenticated.
CREATE OR REPLACE FUNCTION app.public_company_profile(p_tenant_id uuid)
RETURNS TABLE (
  legal_name text,
  trading_name text,
  tax_id text,
  registration_number text,
  entity_type text,
  public_email text,
  public_phone text,
  website text,
  registered_address text,
  showroom_address text,
  city text,
  county text,
  country text,
  postal_code text,
  business_hours jsonb,
  logo_path text,
  favicon_path text,
  currency text
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

  -- Only expose for publicly visible tenants (active|trial).
  IF NOT EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = p_tenant_id AND t.status IN ('active', 'trial')
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.legal_name,
    p.trading_name,
    p.tax_id,
    p.registration_number,
    p.entity_type::text,
    p.public_email,
    p.public_phone,
    p.website,
    p.registered_address,
    p.showroom_address,
    p.city,
    p.county,
    p.country,
    p.postal_code,
    p.business_hours,
    p.logo_path,
    p.favicon_path,
    p.currency
  FROM public.tenant_company_profiles p
  WHERE p.tenant_id = p_tenant_id;
END;
$$;--> statement-breakpoint

REVOKE ALL ON FUNCTION app.public_company_profile(uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.public_company_profile(uuid) TO anon, authenticated;
