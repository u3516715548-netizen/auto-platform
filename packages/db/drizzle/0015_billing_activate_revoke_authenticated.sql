-- Etapa 26B security fix:
-- 1) activate_tenant_from_checkout must NOT be executable by authenticated/anon
--    (SECURITY DEFINER would otherwise let any JWT activate a pending checkout).
-- 2) begin/attach bind p_profile_id to auth.uid() when a JWT session is present
--    (server DATABASE_URL as postgres has auth.uid() NULL and remains allowed).

REVOKE ALL ON FUNCTION app.activate_tenant_from_checkout(text, text, text, text, text, text) FROM PUBLIC;--> statement-breakpoint
REVOKE ALL ON FUNCTION app.activate_tenant_from_checkout(text, text, text, text, text, text) FROM authenticated;--> statement-breakpoint
REVOKE ALL ON FUNCTION app.activate_tenant_from_checkout(text, text, text, text, text, text) FROM anon;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.activate_tenant_from_checkout(text, text, text, text, text, text) TO postgres;--> statement-breakpoint

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
  -- PostgREST / JWT callers cannot act as another profile.
  IF auth.uid() IS NOT NULL AND p_profile_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'forbidden_profile';
  END IF;

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

  IF EXISTS (
    SELECT 1 FROM public.billing_checkout_sessions s
    WHERE s.profile_id = p_profile_id AND s.status = 'pending'
  ) THEN
    RAISE EXCEPTION 'pending_exists';
  END IF;

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
  IF auth.uid() IS NOT NULL AND p_profile_id IS DISTINCT FROM auth.uid() THEN
    RETURN 'forbidden';
  END IF;

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
$$;
