-- Etapa 26B: billing checkout + subscriptions + entitlements + webhook idempotency.
-- FORCE RLS on all billing tables; no anon policies.
-- Provisioning via SECURITY DEFINER helpers (no service_role on user paths).

CREATE TYPE "public"."commercial_plan_code" AS ENUM(
  'plan_50',
  'business',
  'premium',
  'enterprise'
);--> statement-breakpoint

CREATE TYPE "public"."billing_provider" AS ENUM(
  'stripe',
  'netopia',
  'noop'
);--> statement-breakpoint

CREATE TYPE "public"."billing_checkout_status" AS ENUM(
  'pending',
  'completed',
  'expired',
  'failed'
);--> statement-breakpoint

CREATE TYPE "public"."billing_subscription_status" AS ENUM(
  'trialing',
  'active',
  'past_due',
  'canceled',
  'incomplete'
);--> statement-breakpoint

CREATE TYPE "public"."entitlement_source" AS ENUM(
  'checkout',
  'manual',
  'legacy'
);--> statement-breakpoint

CREATE TABLE "tenant_entitlements" (
  "tenant_id" uuid PRIMARY KEY NOT NULL,
  "plan_code" "public"."commercial_plan_code" NOT NULL,
  "max_published_vehicles" integer,
  "source" "public"."entitlement_source" DEFAULT 'checkout' NOT NULL,
  "valid_until" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "tenant_entitlements_tenant_id_tenants_id_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "tenant_entitlements_max_published_nonneg"
    CHECK ("max_published_vehicles" IS NULL OR "max_published_vehicles" >= 0)
);--> statement-breakpoint

CREATE TABLE "billing_checkout_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "profile_id" uuid NOT NULL,
  "tenant_id" uuid NOT NULL,
  "plan_code" "public"."commercial_plan_code" NOT NULL,
  "status" "public"."billing_checkout_status" DEFAULT 'pending' NOT NULL,
  "provider" "public"."billing_provider",
  "external_session_id" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "completed_at" timestamp with time zone,
  CONSTRAINT "billing_checkout_sessions_profile_id_profiles_id_fk"
    FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "billing_checkout_sessions_tenant_id_tenants_id_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "billing_checkout_sessions_self_serve_plan"
    CHECK ("plan_code" IN ('plan_50', 'business', 'premium'))
);--> statement-breakpoint

CREATE INDEX "billing_checkout_sessions_profile_id_idx"
  ON "billing_checkout_sessions" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "billing_checkout_sessions_tenant_id_idx"
  ON "billing_checkout_sessions" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_checkout_sessions_provider_external_uidx"
  ON "billing_checkout_sessions" USING btree ("provider", "external_session_id");--> statement-breakpoint

CREATE TABLE "billing_subscriptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "provider" "public"."billing_provider" NOT NULL,
  "external_subscription_id" text NOT NULL,
  "status" "public"."billing_subscription_status" DEFAULT 'incomplete' NOT NULL,
  "plan_code" "public"."commercial_plan_code" NOT NULL,
  "current_period_start" timestamp with time zone,
  "current_period_end" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "billing_subscriptions_tenant_id_tenants_id_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action
);--> statement-breakpoint

CREATE UNIQUE INDEX "billing_subscriptions_tenant_uidx"
  ON "billing_subscriptions" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_subscriptions_provider_external_uidx"
  ON "billing_subscriptions" USING btree ("provider", "external_subscription_id");--> statement-breakpoint

CREATE TABLE "billing_webhook_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "provider" "public"."billing_provider" NOT NULL,
  "event_id" text NOT NULL,
  "event_type" text NOT NULL,
  "payload_hash" text,
  "processed_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE UNIQUE INDEX "billing_webhook_events_provider_event_uidx"
  ON "billing_webhook_events" USING btree ("provider", "event_id");--> statement-breakpoint

ALTER TABLE "tenant_entitlements" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tenant_entitlements" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "billing_checkout_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "billing_checkout_sessions" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "billing_subscriptions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "billing_subscriptions" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "billing_webhook_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "billing_webhook_events" FORCE ROW LEVEL SECURITY;--> statement-breakpoint

-- Members may read own-tenant entitlements / checkout / subscription. No client writes.
CREATE POLICY tenant_entitlements_select_member ON public.tenant_entitlements
  FOR SELECT
  USING (app.has_tenant_access(tenant_id));--> statement-breakpoint

CREATE POLICY billing_checkout_sessions_select_member ON public.billing_checkout_sessions
  FOR SELECT
  USING (
    profile_id = app.current_profile_id()
    OR app.has_tenant_access(tenant_id)
  );--> statement-breakpoint

CREATE POLICY billing_subscriptions_select_member ON public.billing_subscriptions
  FOR SELECT
  USING (app.has_tenant_access(tenant_id));--> statement-breakpoint

-- No SELECT policy on billing_webhook_events (server DEFINER only).
-- No INSERT/UPDATE/DELETE policies for authenticated on billing tables.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    GRANT SELECT ON public.tenant_entitlements TO authenticated;
    GRANT SELECT ON public.billing_checkout_sessions TO authenticated;
    GRANT SELECT ON public.billing_subscriptions TO authenticated;
  END IF;
END $$;--> statement-breakpoint

-- Plan limit helper (server catalog mirror; enterprise not self-serve).
CREATE OR REPLACE FUNCTION app.commercial_plan_max_published(p_plan public.commercial_plan_code)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_plan
    WHEN 'plan_50' THEN 50
    WHEN 'business' THEN 150
    WHEN 'premium' THEN 500
    WHEN 'enterprise' THEN NULL
  END;
$$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION app.is_reserved_tenant_slug(p_slug text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(btrim(p_slug)) IN (
    'www', 'api', 'admin', 'app', 'mail', 'ftp', 'localhost',
    'acme', 'beta', 'static', 'assets', 'cdn', 'status',
    'login', 'logout', 'signup', 'register', 'checkout', 'preturi',
    'dashboard', 'invite', 'onboarding', 'billing', 'webhook',
    'support', 'help', 'docs', 'blog', 'null', 'undefined'
  );
$$;--> statement-breakpoint

-- Begin self-serve checkout: draft suspended tenant + owner membership + pending session.
CREATE OR REPLACE FUNCTION app.begin_self_serve_checkout(
  p_profile_id uuid,
  p_plan_code text,
  p_tenant_name text,
  p_tenant_slug text
)
RETURNS TABLE (checkout_id uuid, tenant_id uuid, plan_code text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan public.commercial_plan_code;
  v_slug text;
  v_name text;
  v_tenant_id uuid;
  v_checkout_id uuid;
  v_existing_owner uuid;
BEGIN
  IF p_profile_id IS NULL THEN
    RAISE EXCEPTION 'invalid_profile';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = p_profile_id) THEN
    RAISE EXCEPTION 'profile_missing';
  END IF;

  IF p_plan_code IS NULL OR p_plan_code NOT IN ('plan_50', 'business', 'premium') THEN
    RAISE EXCEPTION 'invalid_plan';
  END IF;
  v_plan := p_plan_code::public.commercial_plan_code;

  v_name := btrim(COALESCE(p_tenant_name, ''));
  IF char_length(v_name) < 2 OR char_length(v_name) > 80 THEN
    RAISE EXCEPTION 'invalid_name';
  END IF;

  v_slug := lower(btrim(COALESCE(p_tenant_slug, '')));
  IF v_slug !~ '^[a-z0-9][a-z0-9-]{0,46}[a-z0-9]$' THEN
    RAISE EXCEPTION 'invalid_slug';
  END IF;
  IF app.is_reserved_tenant_slug(v_slug) THEN
    RAISE EXCEPTION 'reserved_slug';
  END IF;

  IF EXISTS (SELECT 1 FROM public.tenants t WHERE t.slug = v_slug) THEN
    RAISE EXCEPTION 'slug_taken';
  END IF;

  -- One in-flight pending checkout per profile (MVP).
  IF EXISTS (
    SELECT 1 FROM public.billing_checkout_sessions s
    WHERE s.profile_id = p_profile_id AND s.status = 'pending'
  ) THEN
    RAISE EXCEPTION 'pending_exists';
  END IF;

  -- Profile must not already own an active/trial tenant (MVP single dealer).
  SELECT m.tenant_id INTO v_existing_owner
  FROM public.memberships m
  JOIN public.tenants t ON t.id = m.tenant_id
  WHERE m.profile_id = p_profile_id
    AND m.role = 'owner'
    AND t.status IN ('active', 'trial')
  LIMIT 1;
  IF v_existing_owner IS NOT NULL THEN
    RAISE EXCEPTION 'already_owner';
  END IF;

  INSERT INTO public.tenants (name, slug, status, plan, branding)
  VALUES (
    v_name,
    v_slug,
    'suspended',
    'starter',
    '{}'::jsonb
  )
  RETURNING id INTO v_tenant_id;

  INSERT INTO public.memberships (tenant_id, profile_id, role)
  VALUES (v_tenant_id, p_profile_id, 'owner');

  INSERT INTO public.billing_checkout_sessions (
    profile_id, tenant_id, plan_code, status
  )
  VALUES (p_profile_id, v_tenant_id, v_plan, 'pending')
  RETURNING id INTO v_checkout_id;

  checkout_id := v_checkout_id;
  tenant_id := v_tenant_id;
  plan_code := v_plan::text;
  RETURN NEXT;
END;
$$;--> statement-breakpoint

REVOKE ALL ON FUNCTION app.begin_self_serve_checkout(uuid, text, text, text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.begin_self_serve_checkout(uuid, text, text, text) TO authenticated;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.begin_self_serve_checkout(uuid, text, text, text) TO postgres;--> statement-breakpoint

CREATE OR REPLACE FUNCTION app.attach_checkout_provider_session(
  p_checkout_id uuid,
  p_profile_id uuid,
  p_provider text,
  p_external_session_id text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_provider public.billing_provider;
  sess public.billing_checkout_sessions%ROWTYPE;
BEGIN
  IF p_checkout_id IS NULL OR p_profile_id IS NULL THEN
    RETURN 'invalid';
  END IF;
  IF p_provider IS NULL OR p_provider NOT IN ('stripe', 'netopia', 'noop') THEN
    RETURN 'invalid_provider';
  END IF;
  IF p_external_session_id IS NULL OR length(btrim(p_external_session_id)) < 3 THEN
    RETURN 'invalid_external';
  END IF;

  v_provider := p_provider::public.billing_provider;

  SELECT * INTO sess
  FROM public.billing_checkout_sessions
  WHERE id = p_checkout_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 'not_found';
  END IF;
  IF sess.profile_id <> p_profile_id THEN
    RETURN 'forbidden';
  END IF;
  IF sess.status <> 'pending' THEN
    RETURN 'not_pending';
  END IF;

  UPDATE public.billing_checkout_sessions
  SET
    provider = v_provider,
    external_session_id = btrim(p_external_session_id),
    updated_at = now()
  WHERE id = p_checkout_id;

  RETURN 'ok';
END;
$$;--> statement-breakpoint

REVOKE ALL ON FUNCTION app.attach_checkout_provider_session(uuid, uuid, text, text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.attach_checkout_provider_session(uuid, uuid, text, text) TO authenticated;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.attach_checkout_provider_session(uuid, uuid, text, text) TO postgres;--> statement-breakpoint

-- Webhook activation: idempotent on (provider, event_id).
CREATE OR REPLACE FUNCTION app.activate_tenant_from_checkout(
  p_provider text,
  p_event_id text,
  p_event_type text,
  p_external_session_id text,
  p_external_subscription_id text,
  p_payload_hash text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_provider public.billing_provider;
  sess public.billing_checkout_sessions%ROWTYPE;
  v_max integer;
BEGIN
  IF p_provider IS NULL OR p_provider NOT IN ('stripe', 'netopia', 'noop') THEN
    RETURN 'invalid_provider';
  END IF;
  IF p_event_id IS NULL OR length(btrim(p_event_id)) < 3 THEN
    RETURN 'invalid_event';
  END IF;
  IF p_external_session_id IS NULL OR length(btrim(p_external_session_id)) < 3 THEN
    RETURN 'invalid_session';
  END IF;

  v_provider := p_provider::public.billing_provider;

  BEGIN
    INSERT INTO public.billing_webhook_events (
      provider, event_id, event_type, payload_hash
    )
    VALUES (
      v_provider,
      btrim(p_event_id),
      COALESCE(NULLIF(btrim(p_event_type), ''), 'unknown'),
      p_payload_hash
    );
  EXCEPTION WHEN unique_violation THEN
    RETURN 'duplicate';
  END;

  SELECT * INTO sess
  FROM public.billing_checkout_sessions
  WHERE provider = v_provider
    AND external_session_id = btrim(p_external_session_id)
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 'checkout_not_found';
  END IF;

  IF sess.status = 'completed' THEN
    RETURN 'already_completed';
  END IF;

  IF sess.status <> 'pending' THEN
    RETURN 'not_pending';
  END IF;

  v_max := app.commercial_plan_max_published(sess.plan_code);

  UPDATE public.tenants
  SET status = 'active', updated_at = now()
  WHERE id = sess.tenant_id;

  INSERT INTO public.tenant_entitlements (
    tenant_id, plan_code, max_published_vehicles, source
  )
  VALUES (sess.tenant_id, sess.plan_code, v_max, 'checkout')
  ON CONFLICT (tenant_id) DO UPDATE
  SET
    plan_code = EXCLUDED.plan_code,
    max_published_vehicles = EXCLUDED.max_published_vehicles,
    source = 'checkout',
    updated_at = now();

  IF p_external_subscription_id IS NOT NULL AND length(btrim(p_external_subscription_id)) >= 3 THEN
    INSERT INTO public.billing_subscriptions (
      tenant_id,
      provider,
      external_subscription_id,
      status,
      plan_code
    )
    VALUES (
      sess.tenant_id,
      v_provider,
      btrim(p_external_subscription_id),
      'active',
      sess.plan_code
    )
    ON CONFLICT (tenant_id) DO UPDATE
    SET
      external_subscription_id = EXCLUDED.external_subscription_id,
      status = 'active',
      plan_code = EXCLUDED.plan_code,
      provider = EXCLUDED.provider,
      updated_at = now();
  END IF;

  UPDATE public.billing_checkout_sessions
  SET
    status = 'completed',
    completed_at = now(),
    updated_at = now()
  WHERE id = sess.id;

  RETURN 'activated';
END;
$$;--> statement-breakpoint

REVOKE ALL ON FUNCTION app.activate_tenant_from_checkout(text, text, text, text, text, text) FROM PUBLIC;--> statement-breakpoint
-- Server-only (DATABASE_URL / postgres). NEVER grant to authenticated/anon —
-- signature verification lives in the Node webhook; DB must not be callable as JWT RPC.
GRANT EXECUTE ON FUNCTION app.activate_tenant_from_checkout(text, text, text, text, text, text) TO postgres;
