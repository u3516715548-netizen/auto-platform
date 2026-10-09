-- Etapa 20: finance INSERT vehicle same-tenant check under anon.
-- Raw EXISTS on vehicles can be skewed by public available SELECT (cross-tenant visibility).
-- Use SECURITY DEFINER to compare tenant_id authoritatively (mirrors lead helper).

CREATE OR REPLACE FUNCTION app.vehicle_belongs_to_tenant(p_vehicle_id uuid, p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.vehicles v
    WHERE v.id = p_vehicle_id
      AND v.tenant_id = p_tenant_id
  );
$$;--> statement-breakpoint

REVOKE ALL ON FUNCTION app.vehicle_belongs_to_tenant(uuid, uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.vehicle_belongs_to_tenant(uuid, uuid) TO anon, authenticated;--> statement-breakpoint

DROP POLICY IF EXISTS finance_applications_insert_member_or_public ON public.finance_applications;--> statement-breakpoint

CREATE POLICY finance_applications_insert_member_or_public ON public.finance_applications
  FOR INSERT
  WITH CHECK (
    (
      app.current_profile_id() IS NULL
      AND EXISTS (
        SELECT 1 FROM public.tenants t
        WHERE t.id = tenant_id AND t.status = 'active'
      )
      AND (
        vehicle_id IS NULL
        OR app.vehicle_belongs_to_tenant(vehicle_id, tenant_id)
      )
      AND app.lead_belongs_to_tenant(lead_id, tenant_id)
    )
    OR (
      app.has_tenant_access(tenant_id)
      AND tenant_id = app.current_tenant_id()
      AND (
        vehicle_id IS NULL
        OR app.vehicle_belongs_to_tenant(vehicle_id, tenant_id)
      )
      AND app.lead_belongs_to_tenant(lead_id, tenant_id)
    )
  );
