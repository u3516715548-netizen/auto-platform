-- Etapa 17: lead consent + email notification delivery status.
-- Does NOT change RLS / FORCE RLS or existing FKs. CRM `lead_status` unchanged.

CREATE TYPE "public"."lead_notification_status" AS ENUM(
  'pending',
  'skipped',
  'not_configured',
  'no_recipients',
  'sent',
  'failed'
);--> statement-breakpoint

ALTER TABLE "leads" ADD COLUMN "consent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "consent_version" text DEFAULT 'v1';--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "notification_status" "public"."lead_notification_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "notification_attempted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "notification_reason" text;--> statement-breakpoint

-- Backfill historical leads: consent timestamp from created_at; notifications never attempted.
UPDATE "leads" SET "consent_at" = "created_at" WHERE "consent_at" IS NULL;--> statement-breakpoint
UPDATE "leads" SET "notification_status" = 'skipped';--> statement-breakpoint
UPDATE "leads" SET "consent_version" = 'v1' WHERE "consent_version" IS NULL;--> statement-breakpoint

ALTER TABLE "leads" ALTER COLUMN "consent_at" SET NOT NULL;--> statement-breakpoint

CREATE INDEX "leads_notification_status_idx" ON "leads" USING btree ("notification_status");
