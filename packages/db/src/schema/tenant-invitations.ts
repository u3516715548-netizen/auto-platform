import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { membershipRoleEnum, tenantInvitationStatusEnum } from "./enums";
import { profiles } from "./profiles";
import { tenants } from "./tenants";

/**
 * Etapa 21 — owner-managed team invitations.
 * Raw invite tokens are never stored; only token_hash.
 */
export const tenantInvitations = pgTable(
  "tenant_invitations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: membershipRoleEnum("role").notNull(),
    tokenHash: text("token_hash").notNull(),
    invitedByProfileId: uuid("invited_by_profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    status: tenantInvitationStatusEnum("status").notNull().default("pending"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    acceptedByProfileId: uuid("accepted_by_profile_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("tenant_invitations_token_hash_uidx").on(table.tokenHash),
    uniqueIndex("tenant_invitations_tenant_email_pending_uidx")
      .on(table.tenantId, table.email)
      .where(sql`${table.status} = 'pending'`),
    index("tenant_invitations_tenant_id_idx").on(table.tenantId),
    index("tenant_invitations_tenant_status_idx").on(table.tenantId, table.status),
    index("tenant_invitations_email_idx").on(table.email),
  ],
);
