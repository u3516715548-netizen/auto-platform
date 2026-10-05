CREATE TYPE "public"."lead_status" AS ENUM('new', 'contacted', 'qualified', 'won', 'lost', 'archived');--> statement-breakpoint
CREATE TYPE "public"."membership_role" AS ENUM('owner', 'manager', 'sales', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."reservation_status" AS ENUM('active', 'expired', 'cancelled', 'converted');--> statement-breakpoint
CREATE TYPE "public"."tenant_plan" AS ENUM('starter', 'premium');--> statement-breakpoint
CREATE TYPE "public"."tenant_status" AS ENUM('active', 'suspended', 'trial');--> statement-breakpoint
CREATE TYPE "public"."vehicle_media_type" AS ENUM('image', 'video', 'document');--> statement-breakpoint
CREATE TYPE "public"."vehicle_status" AS ENUM('draft', 'available', 'reserved', 'sold', 'archived');--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"status" "tenant_status" DEFAULT 'trial' NOT NULL,
	"plan" "tenant_plan" DEFAULT 'starter' NOT NULL,
	"custom_domain" text,
	"branding" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"role" "membership_role" DEFAULT 'viewer' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"status" "vehicle_status" DEFAULT 'draft' NOT NULL,
	"slug" text NOT NULL,
	"vin" text,
	"make" text NOT NULL,
	"model" text NOT NULL,
	"year" integer NOT NULL,
	"mileage" integer DEFAULT 0 NOT NULL,
	"price" numeric(12, 2) NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"specs" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicle_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"storage_path" text NOT NULL,
	"type" "vehicle_media_type" DEFAULT 'image' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"alt_text" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"vehicle_id" uuid,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"message" text,
	"source" text DEFAULT 'storefront' NOT NULL,
	"status" "lead_status" DEFAULT 'new' NOT NULL,
	"assigned_to" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"status" "reservation_status" DEFAULT 'active' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_by" uuid,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"actor_profile_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenant_features" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"feature_key" text NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_media" ADD CONSTRAINT "vehicle_media_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_media" ADD CONSTRAINT "vehicle_media_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_assigned_to_profiles_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_profile_id_profiles_id_fk" FOREIGN KEY ("actor_profile_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_features" ADD CONSTRAINT "tenant_features_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tenants_slug_uidx" ON "tenants" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "tenants_custom_domain_uidx" ON "tenants" USING btree ("custom_domain");--> statement-breakpoint
CREATE UNIQUE INDEX "memberships_tenant_profile_uidx" ON "memberships" USING btree ("tenant_id","profile_id");--> statement-breakpoint
CREATE INDEX "memberships_tenant_id_idx" ON "memberships" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "memberships_profile_id_idx" ON "memberships" USING btree ("profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "vehicles_tenant_slug_uidx" ON "vehicles" USING btree ("tenant_id","slug");--> statement-breakpoint
CREATE INDEX "vehicles_tenant_id_idx" ON "vehicles" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "vehicles_status_idx" ON "vehicles" USING btree ("status");--> statement-breakpoint
CREATE INDEX "vehicles_created_at_idx" ON "vehicles" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "vehicles_vin_idx" ON "vehicles" USING btree ("vin");--> statement-breakpoint
CREATE INDEX "vehicle_media_tenant_id_idx" ON "vehicle_media" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "vehicle_media_vehicle_id_idx" ON "vehicle_media" USING btree ("vehicle_id");--> statement-breakpoint
CREATE INDEX "vehicle_media_created_at_idx" ON "vehicle_media" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "leads_tenant_id_idx" ON "leads" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "leads_vehicle_id_idx" ON "leads" USING btree ("vehicle_id");--> statement-breakpoint
CREATE INDEX "leads_status_idx" ON "leads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "leads_created_at_idx" ON "leads" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "reservations_tenant_id_idx" ON "reservations" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "reservations_vehicle_id_idx" ON "reservations" USING btree ("vehicle_id");--> statement-breakpoint
CREATE INDEX "reservations_status_idx" ON "reservations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "reservations_created_at_idx" ON "reservations" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "reservations_tenant_idempotency_uidx" ON "reservations" USING btree ("tenant_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "reservations_one_active_per_vehicle_uidx" ON "reservations" USING btree ("vehicle_id") WHERE "reservations"."status" = 'active';--> statement-breakpoint
CREATE INDEX "audit_logs_tenant_id_idx" ON "audit_logs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tenant_features_tenant_key_uidx" ON "tenant_features" USING btree ("tenant_id","feature_key");--> statement-breakpoint
CREATE INDEX "tenant_features_tenant_id_idx" ON "tenant_features" USING btree ("tenant_id");