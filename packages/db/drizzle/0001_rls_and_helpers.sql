-- Etapa 2: RLS helpers + policies + optional auth.users FK
-- Session GUCs (set by packages/db/src/rls.ts):
--   app.profile_id  — current profile / auth user id
--   app.tenant_id   — active tenant (must match a membership)

CREATE SCHEMA IF NOT EXISTS app;

CREATE OR REPLACE FUNCTION app.current_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.profile_id', true), '')::uuid;
$$;

CREATE OR REPLACE FUNCTION app.current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.tenant_id', true), '')::uuid;
$$;

CREATE OR REPLACE FUNCTION app.has_tenant_access(target_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.memberships m
    WHERE m.tenant_id = target_tenant_id
      AND m.profile_id = app.current_profile_id()
  )
  OR (
    app.current_tenant_id() IS NOT NULL
    AND app.current_tenant_id() = target_tenant_id
    AND EXISTS (
      SELECT 1
      FROM public.memberships m
      WHERE m.tenant_id = target_tenant_id
        AND m.profile_id = app.current_profile_id()
    )
  );
$$;

CREATE OR REPLACE FUNCTION app.has_tenant_role(target_tenant_id uuid, allowed_roles public.membership_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.memberships m
    WHERE m.tenant_id = target_tenant_id
      AND m.profile_id = app.current_profile_id()
      AND m.role = ANY (allowed_roles)
  );
$$;

-- Link profiles to Supabase Auth when available (no-op on plain Postgres).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'auth' AND table_name = 'users'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'profiles_id_fkey'
    ) THEN
      ALTER TABLE public.profiles
        ADD CONSTRAINT profiles_id_fkey
        FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_features ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.tenants FORCE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.memberships FORCE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_media FORCE ROW LEVEL SECURITY;
ALTER TABLE public.leads FORCE ROW LEVEL SECURITY;
ALTER TABLE public.reservations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_features FORCE ROW LEVEL SECURITY;

-- tenants
CREATE POLICY tenants_select_member ON public.tenants
  FOR SELECT
  USING (app.has_tenant_access(id));

CREATE POLICY tenants_update_owner ON public.tenants
  FOR UPDATE
  USING (app.has_tenant_role(id, ARRAY['owner']::public.membership_role[]))
  WITH CHECK (app.has_tenant_role(id, ARRAY['owner']::public.membership_role[]));

-- profiles (own row)
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT
  USING (id = app.current_profile_id());

CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE
  USING (id = app.current_profile_id())
  WITH CHECK (id = app.current_profile_id());

CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT
  WITH CHECK (id = app.current_profile_id());

-- memberships
CREATE POLICY memberships_select_own_or_tenant ON public.memberships
  FOR SELECT
  USING (
    profile_id = app.current_profile_id()
    OR app.has_tenant_access(tenant_id)
  );

CREATE POLICY memberships_insert_owner_manager ON public.memberships
  FOR INSERT
  WITH CHECK (app.has_tenant_role(tenant_id, ARRAY['owner', 'manager']::public.membership_role[]));

CREATE POLICY memberships_update_owner_manager ON public.memberships
  FOR UPDATE
  USING (app.has_tenant_role(tenant_id, ARRAY['owner', 'manager']::public.membership_role[]))
  WITH CHECK (app.has_tenant_role(tenant_id, ARRAY['owner', 'manager']::public.membership_role[]));

CREATE POLICY memberships_delete_owner ON public.memberships
  FOR DELETE
  USING (app.has_tenant_role(tenant_id, ARRAY['owner']::public.membership_role[]));

-- vehicles (staff)
CREATE POLICY vehicles_select_member ON public.vehicles
  FOR SELECT
  USING (app.has_tenant_access(tenant_id));

CREATE POLICY vehicles_insert_staff ON public.vehicles
  FOR INSERT
  WITH CHECK (
    app.has_tenant_role(tenant_id, ARRAY['owner', 'manager', 'sales']::public.membership_role[])
    AND tenant_id = app.current_tenant_id()
  );

CREATE POLICY vehicles_update_staff ON public.vehicles
  FOR UPDATE
  USING (app.has_tenant_role(tenant_id, ARRAY['owner', 'manager', 'sales']::public.membership_role[]))
  WITH CHECK (
    app.has_tenant_role(tenant_id, ARRAY['owner', 'manager', 'sales']::public.membership_role[])
    AND tenant_id = app.current_tenant_id()
  );

CREATE POLICY vehicles_delete_owner_manager ON public.vehicles
  FOR DELETE
  USING (app.has_tenant_role(tenant_id, ARRAY['owner', 'manager']::public.membership_role[]));

-- Public storefront read (anon / no session): only available vehicles.
-- Prepared for Etapa 4 storefront; safe without auth context.
CREATE POLICY vehicles_select_public_available ON public.vehicles
  FOR SELECT
  USING (status = 'available' AND app.current_profile_id() IS NULL);

-- vehicle_media
CREATE POLICY vehicle_media_select_member ON public.vehicle_media
  FOR SELECT
  USING (app.has_tenant_access(tenant_id));

CREATE POLICY vehicle_media_select_public_available ON public.vehicle_media
  FOR SELECT
  USING (
    app.current_profile_id() IS NULL
    AND EXISTS (
      SELECT 1 FROM public.vehicles v
      WHERE v.id = vehicle_id AND v.status = 'available'
    )
  );

CREATE POLICY vehicle_media_mutate_staff ON public.vehicle_media
  FOR ALL
  USING (app.has_tenant_role(tenant_id, ARRAY['owner', 'manager', 'sales']::public.membership_role[]))
  WITH CHECK (
    app.has_tenant_role(tenant_id, ARRAY['owner', 'manager', 'sales']::public.membership_role[])
    AND tenant_id = app.current_tenant_id()
  );

-- leads
CREATE POLICY leads_select_member ON public.leads
  FOR SELECT
  USING (app.has_tenant_access(tenant_id));

CREATE POLICY leads_insert_member_or_public ON public.leads
  FOR INSERT
  WITH CHECK (
    (
      app.current_profile_id() IS NULL
      AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id AND t.status = 'active')
    )
    OR (
      app.has_tenant_access(tenant_id)
      AND tenant_id = app.current_tenant_id()
    )
  );

CREATE POLICY leads_update_staff ON public.leads
  FOR UPDATE
  USING (app.has_tenant_role(tenant_id, ARRAY['owner', 'manager', 'sales']::public.membership_role[]))
  WITH CHECK (
    app.has_tenant_role(tenant_id, ARRAY['owner', 'manager', 'sales']::public.membership_role[])
    AND tenant_id = app.current_tenant_id()
  );

-- reservations
CREATE POLICY reservations_select_member ON public.reservations
  FOR SELECT
  USING (app.has_tenant_access(tenant_id));

CREATE POLICY reservations_insert_staff ON public.reservations
  FOR INSERT
  WITH CHECK (
    app.has_tenant_role(tenant_id, ARRAY['owner', 'manager', 'sales']::public.membership_role[])
    AND tenant_id = app.current_tenant_id()
  );

CREATE POLICY reservations_update_staff ON public.reservations
  FOR UPDATE
  USING (app.has_tenant_role(tenant_id, ARRAY['owner', 'manager', 'sales']::public.membership_role[]))
  WITH CHECK (
    app.has_tenant_role(tenant_id, ARRAY['owner', 'manager', 'sales']::public.membership_role[])
    AND tenant_id = app.current_tenant_id()
  );

-- audit_logs: insert + select for members; no update/delete policies (immutable)
CREATE POLICY audit_logs_select_member ON public.audit_logs
  FOR SELECT
  USING (app.has_tenant_access(tenant_id));

CREATE POLICY audit_logs_insert_member ON public.audit_logs
  FOR INSERT
  WITH CHECK (
    app.has_tenant_access(tenant_id)
    AND tenant_id = app.current_tenant_id()
  );

-- tenant_features
CREATE POLICY tenant_features_select_member ON public.tenant_features
  FOR SELECT
  USING (app.has_tenant_access(tenant_id));

CREATE POLICY tenant_features_mutate_owner ON public.tenant_features
  FOR ALL
  USING (app.has_tenant_role(tenant_id, ARRAY['owner']::public.membership_role[]))
  WITH CHECK (
    app.has_tenant_role(tenant_id, ARRAY['owner']::public.membership_role[])
    AND tenant_id = app.current_tenant_id()
  );

-- Grants for typical Supabase roles (safe if roles missing)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    GRANT USAGE ON SCHEMA app TO authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    GRANT USAGE ON SCHEMA app TO anon;
    GRANT SELECT ON public.vehicles, public.vehicle_media TO anon;
    GRANT INSERT ON public.leads TO anon;
  END IF;
END $$;
