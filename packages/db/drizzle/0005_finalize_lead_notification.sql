-- Etapa 17: narrow SECURITY DEFINER helper for post-insert notification status.
-- Public sessions cannot UPDATE leads (staff-only RLS). This function updates only
-- notification_* columns for an exact lead_id + tenant_id match on an active tenant.
-- Does not open general public UPDATE and does not touch CRM status / PII fields.

CREATE OR REPLACE FUNCTION app.finalize_lead_notification(
  p_lead_id uuid,
  p_tenant_id uuid,
  p_status public.lead_notification_status,
  p_reason text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count int;
  safe_reason text;
BEGIN
  IF p_status = 'pending' OR p_status = 'skipped' THEN
    RETURN false;
  END IF;

  safe_reason := NULLIF(left(trim(coalesce(p_reason, '')), 64), '');

  UPDATE public.leads l
  SET
    notification_status = p_status,
    notification_attempted_at = now(),
    notification_reason = safe_reason,
    updated_at = now()
  WHERE l.id = p_lead_id
    AND l.tenant_id = p_tenant_id
    AND EXISTS (
      SELECT 1
      FROM public.tenants t
      WHERE t.id = p_tenant_id
        AND t.status = 'active'
    );

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count = 1;
END;
$$;--> statement-breakpoint

REVOKE ALL ON FUNCTION app.finalize_lead_notification(uuid, uuid, public.lead_notification_status, text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.finalize_lead_notification(uuid, uuid, public.lead_notification_status, text) TO PUBLIC;
