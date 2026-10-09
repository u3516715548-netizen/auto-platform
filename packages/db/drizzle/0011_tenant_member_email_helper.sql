-- Etapa 21: narrow helper — does this email already belong to a tenant member?
-- Used by invite create (profiles SELECT own hides colleague emails under RLS).

CREATE OR REPLACE FUNCTION app.tenant_member_email_exists(
  p_tenant_id uuid,
  p_email text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_email text;
BEGIN
  IF p_tenant_id IS NULL OR p_email IS NULL THEN
    RETURN false;
  END IF;

  normalized_email := lower(btrim(p_email));
  IF normalized_email = '' THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.memberships m
    INNER JOIN public.profiles p ON p.id = m.profile_id
    WHERE m.tenant_id = p_tenant_id
      AND p.email = normalized_email
  );
END;
$$;--> statement-breakpoint

REVOKE ALL ON FUNCTION app.tenant_member_email_exists(uuid, text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.tenant_member_email_exists(uuid, text) TO authenticated;
