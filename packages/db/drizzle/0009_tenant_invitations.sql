-- Etapa 21: tenant invitations + FORCE RLS (owner-only admin path).

CREATE TYPE "public"."tenant_invitation_status" AS ENUM(
  'pending',
  'accepted',
  'expired',
  'revoked'
);--> statement-breakpoint

CREATE TABLE "tenant_invitations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "email" text NOT NULL,
  "role" "public"."membership_role" NOT NULL,
  "token_hash" text NOT NULL,
  "invited_by_profile_id" uuid NOT NULL,
  "status" "public"."tenant_invitation_status" DEFAULT 'pending' NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "accepted_at" timestamp with time zone,
  "accepted_by_profile_id" uuid,
  "revoked_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "tenant_invitations_role_not_owner_check"
    CHECK ("role" IN ('manager', 'sales', 'viewer')),
  CONSTRAINT "tenant_invitations_email_lower_check"
    CHECK ("email" = lower(btrim("email"))),
  CONSTRAINT "tenant_invitations_tenant_id_tenants_id_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "tenant_invitations_invited_by_profiles_id_fk"
    FOREIGN KEY ("invited_by_profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "tenant_invitations_accepted_by_profiles_id_fk"
    FOREIGN KEY ("accepted_by_profile_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action
);--> statement-breakpoint

CREATE UNIQUE INDEX "tenant_invitations_token_hash_uidx"
  ON "tenant_invitations" USING btree ("token_hash");--> statement-breakpoint

CREATE UNIQUE INDEX "tenant_invitations_tenant_email_pending_uidx"
  ON "tenant_invitations" USING btree ("tenant_id", "email")
  WHERE "status" = 'pending';--> statement-breakpoint

CREATE INDEX "tenant_invitations_tenant_id_idx"
  ON "tenant_invitations" USING btree ("tenant_id");--> statement-breakpoint

CREATE INDEX "tenant_invitations_tenant_status_idx"
  ON "tenant_invitations" USING btree ("tenant_id", "status");--> statement-breakpoint

CREATE INDEX "tenant_invitations_email_idx"
  ON "tenant_invitations" USING btree ("email");--> statement-breakpoint

ALTER TABLE "tenant_invitations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tenant_invitations" FORCE ROW LEVEL SECURITY;--> statement-breakpoint

CREATE POLICY tenant_invitations_select_owner ON public.tenant_invitations
  FOR SELECT
  USING (
    app.has_tenant_role(tenant_id, ARRAY['owner']::public.membership_role[])
  );--> statement-breakpoint

CREATE POLICY tenant_invitations_insert_owner ON public.tenant_invitations
  FOR INSERT
  WITH CHECK (
    app.has_tenant_role(tenant_id, ARRAY['owner']::public.membership_role[])
    AND tenant_id = app.current_tenant_id()
    AND role IN ('manager', 'sales', 'viewer')
  );--> statement-breakpoint

CREATE POLICY tenant_invitations_update_owner ON public.tenant_invitations
  FOR UPDATE
  USING (
    app.has_tenant_role(tenant_id, ARRAY['owner']::public.membership_role[])
  )
  WITH CHECK (
    app.has_tenant_role(tenant_id, ARRAY['owner']::public.membership_role[])
    AND tenant_id = app.current_tenant_id()
    AND role IN ('manager', 'sales', 'viewer')
  );--> statement-breakpoint

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    GRANT SELECT, INSERT, UPDATE ON public.tenant_invitations TO authenticated;
  END IF;
END $$;
