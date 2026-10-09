-- Etapa 19: finance applications + RLS (companion lead in public.leads, source=finance).
-- Notification status remains on the companion lead (Etapa 17 helpers).

CREATE TYPE "public"."finance_applicant_type" AS ENUM('individual', 'company');--> statement-breakpoint
CREATE TYPE "public"."finance_application_status" AS ENUM(
  'new',
  'contacted',
  'in_review',
  'approved',
  'rejected',
  'withdrawn',
  'archived'
);--> statement-breakpoint

CREATE TABLE "finance_applications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "vehicle_id" uuid,
  "lead_id" uuid NOT NULL,
  "applicant_type" "public"."finance_applicant_type" NOT NULL,
  "full_name" text NOT NULL,
  "company_tax_id" text,
  "email" text NOT NULL,
  "phone" text NOT NULL,
  "amount_eur" numeric(12, 2) NOT NULL,
  "term_months" smallint NOT NULL,
  "vehicle_price_eur_snapshot" numeric(12, 2) NOT NULL,
  "estimated_monthly_eur_snapshot" numeric(12, 2) NOT NULL,
  "consent_at" timestamp with time zone NOT NULL,
  "consent_version" text DEFAULT 'finance-v1' NOT NULL,
  "status" "public"."finance_application_status" DEFAULT 'new' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "finance_applications_term_months_check"
    CHECK ("term_months" IN (12, 24, 36, 48, 60)),
  CONSTRAINT "finance_applications_amount_positive_check"
    CHECK ("amount_eur" > 0),
  CONSTRAINT "finance_applications_tenant_id_tenants_id_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "finance_applications_vehicle_id_vehicles_id_fk"
    FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE set null ON UPDATE no action,
  CONSTRAINT "finance_applications_lead_id_leads_id_fk"
    FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action
);--> statement-breakpoint

CREATE INDEX "finance_applications_tenant_id_idx" ON "finance_applications" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "finance_applications_vehicle_id_idx" ON "finance_applications" USING btree ("vehicle_id");--> statement-breakpoint
CREATE INDEX "finance_applications_lead_id_idx" ON "finance_applications" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "finance_applications_status_idx" ON "finance_applications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "finance_applications_created_at_idx" ON "finance_applications" USING btree ("created_at");--> statement-breakpoint

ALTER TABLE "finance_applications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "finance_applications" FORCE ROW LEVEL SECURITY;--> statement-breakpoint

CREATE POLICY finance_applications_select_member ON public.finance_applications
  FOR SELECT
  USING (app.has_tenant_access(tenant_id));--> statement-breakpoint

-- Public insert: anon + active tenant; vehicle (if set) must belong to tenant;
-- lead_id must belong to the same tenant (blocks attaching to foreign leads).
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
      AND EXISTS (
        SELECT 1 FROM public.leads l
        WHERE l.id = lead_id
          AND l.tenant_id = tenant_id
      )
    )
    OR (
      app.has_tenant_access(tenant_id)
      AND tenant_id = app.current_tenant_id()
      AND EXISTS (
        SELECT 1 FROM public.leads l
        WHERE l.id = lead_id
          AND l.tenant_id = tenant_id
      )
    )
  );--> statement-breakpoint

CREATE POLICY finance_applications_update_staff ON public.finance_applications
  FOR UPDATE
  USING (
    app.has_tenant_role(tenant_id, ARRAY['owner', 'manager', 'sales']::public.membership_role[])
  )
  WITH CHECK (
    app.has_tenant_role(tenant_id, ARRAY['owner', 'manager', 'sales']::public.membership_role[])
    AND tenant_id = app.current_tenant_id()
  );--> statement-breakpoint

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    GRANT INSERT ON public.finance_applications TO anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    GRANT SELECT, INSERT, UPDATE ON public.finance_applications TO authenticated;
  END IF;
END $$;
