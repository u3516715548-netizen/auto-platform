/**
 * Reusable audit logging infrastructure.
 * Insert-only; no update/delete helpers by design.
 */

import type { Database } from "./client";
import { auditLogs } from "./schema/audit-logs";

export type WriteAuditLogInput = {
  tenantId: string;
  actorProfileId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
};

export async function writeAuditLog(db: Database, input: WriteAuditLogInput) {
  if (!input.tenantId) {
    throw new Error("writeAuditLog requires tenantId");
  }
  if (!input.action || !input.entityType) {
    throw new Error("writeAuditLog requires action and entityType");
  }

  const [row] = await db
    .insert(auditLogs)
    .values({
      tenantId: input.tenantId,
      actorProfileId: input.actorProfileId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      metadata: input.metadata ?? {},
    })
    .returning();

  return row;
}
