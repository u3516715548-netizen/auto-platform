-- Etapa 21: membership mutations owner-only + narrow accept invitation helper.

DROP POLICY IF EXISTS memberships_insert_owner_manager ON public.memberships;--> statement-breakpoint
DROP POLICY IF EXISTS memberships_update_owner_manager ON public.memberships;--> statement-breakpoint

CREATE POLICY memberships_insert_owner ON public.memberships
  FOR INSERT
  WITH CHECK (
    app.has_tenant_role(tenant_id, ARRAY['owner']::public.membership_role[])
    AND tenant_id = app.current_tenant_id()
  );--> statement-breakpoint

CREATE POLICY memberships_update_owner ON public.memberships
  FOR UPDATE
  USING (
    app.has_tenant_role(tenant_id, ARRAY['owner']::public.membership_role[])
  )
  WITH CHECK (
    app.has_tenant_role(tenant_id, ARRAY['owner']::public.membership_role[])
    AND tenant_id = app.current_tenant_id()
  );--> statement-breakpoint

-- Accept invitation atomically: hash match, email match, active tenant, single-use.
-- Does not expose rows; returns outcome code only.
CREATE OR REPLACE FUNCTION app.accept_tenant_invitation(
  p_token_hash text,
  p_profile_id uuid,
  p_email text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv public.tenant_invitations%ROWTYPE;
  normalized_email text;
  existing_membership uuid;
BEGIN
  IF p_token_hash IS NULL OR length(trim(p_token_hash)) < 32 THEN
    RETURN 'invalid';
  END IF;
  IF p_profile_id IS NULL OR p_email IS NULL THEN
    RETURN 'invalid';
  END IF;

  normalized_email := lower(btrim(p_email));
  IF normalized_email = '' OR normalized_email !~ '^[^@]+@[^@]+\.[^@]+$' THEN
    RETURN 'invalid';
  END IF;

  SELECT * INTO inv
  FROM public.tenant_invitations ti
  WHERE ti.token_hash = p_token_hash
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 'invalid';
  END IF;

  IF inv.status = 'revoked' THEN
    RETURN 'revoked';
  END IF;

  IF inv.status = 'accepted' THEN
    RETURN 'accepted';
  END IF;

  IF inv.status = 'expired' OR inv.expires_at <= now() THEN
    IF inv.status = 'pending' THEN
      UPDATE public.tenant_invitations
      SET status = 'expired', updated_at = now()
      WHERE id = inv.id AND status = 'pending';
    END IF;
    RETURN 'expired';
  END IF;

  IF inv.status <> 'pending' THEN
    RETURN 'invalid';
  END IF;

  IF inv.email <> normalized_email THEN
    RETURN 'email_mismatch';
  END IF;

  IF inv.role NOT IN ('manager', 'sales', 'viewer') THEN
    RETURN 'invalid';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = inv.tenant_id AND t.status = 'active'
  ) THEN
    RETURN 'tenant_inactive';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = p_profile_id
  ) THEN
    RETURN 'profile_missing';
  END IF;

  SELECT m.id INTO existing_membership
  FROM public.memberships m
  WHERE m.tenant_id = inv.tenant_id AND m.profile_id = p_profile_id
  LIMIT 1;

  IF existing_membership IS NOT NULL THEN
    UPDATE public.tenant_invitations
    SET
      status = 'accepted',
      accepted_at = now(),
      accepted_by_profile_id = p_profile_id,
      updated_at = now()
    WHERE id = inv.id AND status = 'pending';
    RETURN 'already_member';
  END IF;

  INSERT INTO public.memberships (tenant_id, profile_id, role)
  VALUES (inv.tenant_id, p_profile_id, inv.role);

  UPDATE public.tenant_invitations
  SET
    status = 'accepted',
    accepted_at = now(),
    accepted_by_profile_id = p_profile_id,
    updated_at = now()
  WHERE id = inv.id AND status = 'pending';

  IF NOT FOUND THEN
    RETURN 'invalid';
  END IF;

  RETURN 'ok';
END;
$$;--> statement-breakpoint

REVOKE ALL ON FUNCTION app.accept_tenant_invitation(text, uuid, text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.accept_tenant_invitation(text, uuid, text) TO authenticated;--> statement-breakpoint

-- Peek safe display fields by token hash (no enumeration by email).
CREATE OR REPLACE FUNCTION app.peek_tenant_invitation(p_token_hash text)
RETURNS TABLE (
  outcome text,
  tenant_name text,
  role text,
  email text,
  expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv public.tenant_invitations%ROWTYPE;
  tname text;
BEGIN
  IF p_token_hash IS NULL OR length(trim(p_token_hash)) < 32 THEN
    outcome := 'invalid';
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT * INTO inv
  FROM public.tenant_invitations ti
  WHERE ti.token_hash = p_token_hash;

  IF NOT FOUND THEN
    outcome := 'invalid';
    RETURN NEXT;
    RETURN;
  END IF;

  IF inv.status = 'revoked' THEN
    outcome := 'revoked';
    RETURN NEXT;
    RETURN;
  END IF;

  IF inv.status = 'accepted' THEN
    outcome := 'accepted';
    RETURN NEXT;
    RETURN;
  END IF;

  IF inv.status = 'expired' OR inv.expires_at <= now() THEN
    IF inv.status = 'pending' THEN
      UPDATE public.tenant_invitations
      SET status = 'expired', updated_at = now()
      WHERE id = inv.id AND status = 'pending';
    END IF;
    outcome := 'expired';
    RETURN NEXT;
    RETURN;
  END IF;

  IF inv.status <> 'pending' THEN
    outcome := 'invalid';
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT t.name INTO tname FROM public.tenants t WHERE t.id = inv.tenant_id;
  IF tname IS NULL THEN
    outcome := 'invalid';
    RETURN NEXT;
    RETURN;
  END IF;

  outcome := 'pending';
  tenant_name := tname;
  role := inv.role::text;
  email := inv.email;
  expires_at := inv.expires_at;
  RETURN NEXT;
END;
$$;--> statement-breakpoint

REVOKE ALL ON FUNCTION app.peek_tenant_invitation(text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.peek_tenant_invitation(text) TO anon, authenticated;
