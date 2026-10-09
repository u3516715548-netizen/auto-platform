-- Etapa 20: finance INSERT policy must verify lead_id same-tenant under anon.
-- Raw EXISTS on public.leads fails for anon because leads_select_member hides rows.
-- Narrow SECURITY DEFINER helper (same pattern as app.finalize_lead_notification).

CREATE OR REPLACE FUNCTION app.lead_belongs_to_tenant(p_lead_id uuid, p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.leads l
    WHERE l.id = p_lead_id
      AND l.tenant_id = p_tenant_id
  );
$$;--> statement-breakpoint

REVOKE ALL ON FUNCTION app.lead_belongs_to_tenant(uuid, uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.lead_belongs_to_tenant(uuid, uuid) TO anon, authenticated;--> statement-breakpoint

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
        OR EXISTS (
          SELECT 1 FROM public.vehicles v
          WHERE v.id = vehicle_id
            AND v.tenant_id = tenant_id
        )
      )
      AND app.lead_belongs_to_tenant(lead_id, tenant_id)
    )
    OR (
      app.has_tenant_access(tenant_id)
      AND tenant_id = app.current_tenant_id()
      AND app.lead_belongs_to_tenant(lead_id, tenant_id)
    )
  );
