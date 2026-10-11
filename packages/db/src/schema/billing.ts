import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import {
  billingCheckoutStatusEnum,
  billingProviderEnum,
  billingSubscriptionStatusEnum,
  commercialPlanCodeEnum,
  entitlementSourceEnum,
} from "./enums";
import { profiles } from "./profiles";
import { tenants } from "./tenants";

/**
 * Etapa 26B — 1:1 entitlements per tenant.
 * Authoritative publish limits live here (not in React / legacy tenants.plan).
 * Anon: no SELECT. Members: SELECT only. Mutations via SECURITY DEFINER / server.
 */
export const tenantEntitlements = pgTable("tenant_entitlements", {
  tenantId: uuid("tenant_id")
    .primaryKey()
    .references(() => tenants.id, { onDelete: "cascade" }),
  planCode: commercialPlanCodeEnum("plan_code").notNull(),
  /** null = unlimited (enterprise / manual). */
  maxPublishedVehicles: integer("max_published_vehicles"),
  source: entitlementSourceEnum("source").notNull().default("checkout"),
  validUntil: timestamp("valid_until", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Self-serve checkout intent. Created after auth; completed by verified webhook.
 */
export const billingCheckoutSessions = pgTable(
  "billing_checkout_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    planCode: commercialPlanCodeEnum("plan_code").notNull(),
    status: billingCheckoutStatusEnum("status").notNull().default("pending"),
    provider: billingProviderEnum("provider"),
    externalSessionId: text("external_session_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    index("billing_checkout_sessions_profile_id_idx").on(table.profileId),
    index("billing_checkout_sessions_tenant_id_idx").on(table.tenantId),
    uniqueIndex("billing_checkout_sessions_provider_external_uidx").on(
      table.provider,
      table.externalSessionId,
    ),
  ],
);

export const billingSubscriptions = pgTable(
  "billing_subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    provider: billingProviderEnum("provider").notNull(),
    externalSubscriptionId: text("external_subscription_id").notNull(),
    status: billingSubscriptionStatusEnum("status").notNull().default("incomplete"),
    planCode: commercialPlanCodeEnum("plan_code").notNull(),
    currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("billing_subscriptions_tenant_uidx").on(table.tenantId),
    uniqueIndex("billing_subscriptions_provider_external_uidx").on(
      table.provider,
      table.externalSubscriptionId,
    ),
  ],
);

/** Idempotency ledger for provider webhooks — no anon access. */
export const billingWebhookEvents = pgTable(
  "billing_webhook_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    provider: billingProviderEnum("provider").notNull(),
    eventId: text("event_id").notNull(),
    eventType: text("event_type").notNull(),
    payloadHash: text("payload_hash"),
    processedAt: timestamp("processed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("billing_webhook_events_provider_event_uidx").on(
      table.provider,
      table.eventId,
    ),
  ],
);
