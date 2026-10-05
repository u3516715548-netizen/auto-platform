-- Etapa 6A: vehicle inventory attributes (nullable for backward compatibility).
-- Does NOT change RLS / FORCE RLS. Publish gate is application-level.

CREATE TYPE "public"."vehicle_accident_status" AS ENUM('none', 'cosmetic', 'minor', 'major', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."vehicle_body_type" AS ENUM('hatchback', 'sedan', 'estate', 'suv', 'coupe', 'convertible', 'mpv', 'van', 'pickup', 'other');--> statement-breakpoint
CREATE TYPE "public"."vehicle_condition" AS ENUM('new', 'used', 'demo');--> statement-breakpoint
CREATE TYPE "public"."vehicle_drive_type" AS ENUM('fwd', 'rwd', 'awd', '4wd');--> statement-breakpoint
CREATE TYPE "public"."vehicle_emission" AS ENUM('euro_3', 'euro_4', 'euro_5', 'euro_6', 'euro_6d', 'euro_6e', 'ev', 'other');--> statement-breakpoint
CREATE TYPE "public"."vehicle_fuel" AS ENUM('petrol', 'diesel', 'hybrid', 'plugin_hybrid', 'electric', 'lpg', 'cng', 'other');--> statement-breakpoint
CREATE TYPE "public"."vehicle_transmission" AS ENUM('manual', 'automatic', 'dct', 'cvt', 'other');--> statement-breakpoint
CREATE TYPE "public"."vehicle_vat_regime" AS ENUM('deductible', 'included', 'not_applicable');--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "fuel" "vehicle_fuel";--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "transmission" "vehicle_transmission";--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "body_type" "vehicle_body_type";--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "drive_type" "vehicle_drive_type";--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "condition" "vehicle_condition";--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "emission_standard" "vehicle_emission";--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "vat_regime" "vehicle_vat_regime";--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "accident_status" "vehicle_accident_status";--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "power_hp" integer;--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "engine_displacement_cc" integer;--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "doors" integer;--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "seats" integer;--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "exterior_color" text;--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "interior_color" text;--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "first_registration_year" integer;--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "first_registration_month" smallint;--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "price_negotiable" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "origin_country" text;--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "location_city" text;--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "warranty_months" integer;--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "warranty_notes" text;--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "has_service_book" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "has_service_history" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "features" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
CREATE INDEX "vehicles_tenant_fuel_idx" ON "vehicles" USING btree ("tenant_id","fuel");--> statement-breakpoint
CREATE INDEX "vehicles_tenant_price_idx" ON "vehicles" USING btree ("tenant_id","price");--> statement-breakpoint
CREATE INDEX "vehicles_tenant_year_idx" ON "vehicles" USING btree ("tenant_id","year");--> statement-breakpoint
CREATE INDEX "vehicles_tenant_body_type_idx" ON "vehicles" USING btree ("tenant_id","body_type");--> statement-breakpoint
-- Map legacy specs.fuel → fuel column (idempotent; does not overwrite set values).
UPDATE "vehicles"
SET "fuel" = CASE lower(coalesce("specs"->>'fuel', ''))
  WHEN 'petrol' THEN 'petrol'::"public"."vehicle_fuel"
  WHEN 'diesel' THEN 'diesel'::"public"."vehicle_fuel"
  WHEN 'hybrid' THEN 'hybrid'::"public"."vehicle_fuel"
  WHEN 'plugin_hybrid' THEN 'plugin_hybrid'::"public"."vehicle_fuel"
  WHEN 'electric' THEN 'electric'::"public"."vehicle_fuel"
  WHEN 'lpg' THEN 'lpg'::"public"."vehicle_fuel"
  WHEN 'cng' THEN 'cng'::"public"."vehicle_fuel"
  WHEN 'other' THEN 'other'::"public"."vehicle_fuel"
  ELSE NULL
END
WHERE "fuel" IS NULL
  AND "specs" ? 'fuel';
