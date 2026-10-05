import { assignLeadSchema, leadIdSchema, updateLeadStatusSchema } from "@auto-platform/types";

export function rejectTenantIdFromLeadForm(formData: FormData): string | null {
  if (
    formData.has("tenant_id") ||
    formData.has("tenantId") ||
    formData.has("tenant") ||
    Boolean(formData.get("tenant_id") || formData.get("tenantId") || formData.get("tenant"))
  ) {
    return "Cerere invalidă.";
  }
  return null;
}

export function parseLeadId(raw: unknown): { ok: true; id: string } | { ok: false; error: string } {
  const parsed = leadIdSchema.safeParse(typeof raw === "string" ? raw : String(raw ?? ""));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "ID lead invalid" };
  }
  return { ok: true, id: parsed.data };
}

export function parseUpdateLeadStatusForm(
  formData: FormData,
): { ok: true; data: { leadId: string; status: string } } | { ok: false; error: string } {
  const parsed = updateLeadStatusSchema.safeParse({
    leadId: formData.get("leadId"),
    status: formData.get("status"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Date invalide." };
  }
  return { ok: true, data: parsed.data };
}

export function parseAssignLeadForm(
  formData: FormData,
):
  | { ok: true; data: { leadId: string; assignedTo: string | null } }
  | { ok: false; error: string } {
  const rawAssignee = formData.get("assignedTo");
  const assignedTo =
    rawAssignee === null || rawAssignee === "" || rawAssignee === "__none__"
      ? null
      : String(rawAssignee);

  const parsed = assignLeadSchema.safeParse({
    leadId: formData.get("leadId"),
    assignedTo,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Date invalide." };
  }
  return { ok: true, data: parsed.data };
}
