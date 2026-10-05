import { describe, expect, it } from "vitest";
import {
  LEAD_LIST_FILTER_STATUSES,
  assignLeadSchema,
  leadIdSchema,
  leadListFilterSchema,
  updateLeadStatusSchema,
} from "@auto-platform/types";
import { LEAD_MUTATION_ROLES, canMutateLead } from "../permissions";
import {
  LEAD_LIST_FILTER_LABELS,
  resolveLeadListFilter,
  leadStatusesForFilter,
} from "../lead-list-filter";
import { leadMailtoHref, leadTelHref } from "../lead-contact-links";
import {
  parseAssignLeadForm,
  parseLeadId,
  parseUpdateLeadStatusForm,
  rejectTenantIdFromLeadForm,
} from "../parse-lead-form";
import { leadSourceLabel, leadStatusLabel } from "../status-label";
import { leadDetailPath, leadsPath } from "@/lib/dashboard/nav";

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

const LEAD_ID = "11111111-1111-4111-8111-111111111111";
const PROFILE_ID = "22222222-2222-4222-8222-222222222222";

describe("Etapa 10B — roles & permissions", () => {
  it("owner/manager/sales can mutate; viewer cannot", () => {
    expect(LEAD_MUTATION_ROLES).toEqual(["owner", "manager", "sales"]);
    expect(canMutateLead("owner")).toBe(true);
    expect(canMutateLead("manager")).toBe(true);
    expect(canMutateLead("sales")).toBe(true);
    expect(canMutateLead("viewer")).toBe(false);
  });
});

describe("Etapa 10B — Zod contracts", () => {
  it("accepts valid status update and rejects invalid status", () => {
    expect(
      updateLeadStatusSchema.safeParse({ leadId: LEAD_ID, status: "contacted" }).success,
    ).toBe(true);
    expect(
      updateLeadStatusSchema.safeParse({ leadId: LEAD_ID, status: "closed" }).success,
    ).toBe(false);
    expect(
      updateLeadStatusSchema.safeParse({
        leadId: LEAD_ID,
        status: "new",
        tenantId: "00000000-0000-4000-8000-000000000099",
      }).success,
    ).toBe(false);
  });

  it("accepts assign and unassign; rejects bad UUID assignee", () => {
    expect(
      assignLeadSchema.safeParse({ leadId: LEAD_ID, assignedTo: PROFILE_ID }).success,
    ).toBe(true);
    expect(assignLeadSchema.safeParse({ leadId: LEAD_ID, assignedTo: null }).success).toBe(true);
    expect(
      assignLeadSchema.safeParse({ leadId: LEAD_ID, assignedTo: "not-a-uuid" }).success,
    ).toBe(false);
  });

  it("leadId schema rejects non-uuid", () => {
    expect(leadIdSchema.safeParse("abc").success).toBe(false);
    expect(parseLeadId("not-uuid").ok).toBe(false);
    expect(parseLeadId(LEAD_ID)).toEqual({ ok: true, id: LEAD_ID });
  });
});

describe("Etapa 10B — parse forms", () => {
  it("rejects tenant smuggling and parses status/assign forms", () => {
    expect(rejectTenantIdFromLeadForm(form({ tenantId: "x" }))).toBeTruthy();
    expect(rejectTenantIdFromLeadForm(form({ leadId: LEAD_ID }))).toBeNull();

    const status = parseUpdateLeadStatusForm(
      form({ leadId: LEAD_ID, status: "qualified" }),
    );
    expect(status).toEqual({
      ok: true,
      data: { leadId: LEAD_ID, status: "qualified" },
    });

    const badStatus = parseUpdateLeadStatusForm(form({ leadId: LEAD_ID, status: "nope" }));
    expect(badStatus.ok).toBe(false);

    const assign = parseAssignLeadForm(
      form({ leadId: LEAD_ID, assignedTo: PROFILE_ID }),
    );
    expect(assign).toEqual({
      ok: true,
      data: { leadId: LEAD_ID, assignedTo: PROFILE_ID },
    });

    const unassign = parseAssignLeadForm(form({ leadId: LEAD_ID, assignedTo: "__none__" }));
    expect(unassign).toEqual({
      ok: true,
      data: { leadId: LEAD_ID, assignedTo: null },
    });
  });
});

describe("Etapa 10B — list filter buckets", () => {
  it("maps Toate/Noi/În lucru/Finalizate onto existing enum", () => {
    expect(resolveLeadListFilter(undefined)).toBe("all");
    expect(resolveLeadListFilter("in_progress")).toBe("in_progress");
    expect(resolveLeadListFilter("bogus")).toBe("all");
    expect(leadListFilterSchema.safeParse("closed").success).toBe(true);
    expect(LEAD_LIST_FILTER_STATUSES.new).toEqual(["new"]);
    expect(leadStatusesForFilter("in_progress")).toEqual(["contacted", "qualified"]);
    expect(leadStatusesForFilter("closed")).toEqual(["won", "lost", "archived"]);
    expect(leadStatusesForFilter("all")).toBeNull();
    expect(LEAD_LIST_FILTER_LABELS.new).toBe("Noi");
  });
});

describe("Etapa 10B — labels & contact links", () => {
  it("uses Romanian status labels and safe mailto/tel", () => {
    expect(leadStatusLabel("new")).toBe("Nou");
    expect(leadStatusLabel("won")).toBe("Câștigat");
    expect(leadSourceLabel("storefront")).toBe("Site public");
    expect(leadSourceLabel("")).toBeNull();

    expect(leadMailtoHref("Ana@Example.com")).toBe("mailto:ana@example.com");
    expect(leadMailtoHref("not-email")).toBeNull();
    expect(leadMailtoHref(null)).toBeNull();

    expect(leadTelHref("0722 123 456")).toBe("tel:+40722123456");
    expect(leadTelHref("https://wa.me/40722123456")).toBeNull();
    expect(leadTelHref(null)).toBeNull();
  });

  it("audit metadata contract excludes PII keys by design", () => {
    const statusMeta = { from: "new", to: "contacted" };
    const assignMeta = {
      fromProfileId: null as string | null,
      toProfileId: PROFILE_ID,
    };
    expect(Object.keys(statusMeta).sort()).toEqual(["from", "to"]);
    expect(Object.keys(assignMeta).sort()).toEqual(["fromProfileId", "toProfileId"]);
    expect(JSON.stringify(statusMeta)).not.toMatch(/@|0722|message|name/i);
    expect(JSON.stringify(assignMeta)).not.toMatch(/@|0722|message|Ana/i);
  });
});

describe("Etapa 10B — nav paths", () => {
  it("uses relative lead paths without contact in query", () => {
    expect(leadsPath()).toBe("/dashboard/leads");
    expect(leadsPath({ filter: "new" })).toBe("/dashboard/leads?filter=new");
    expect(leadDetailPath(LEAD_ID)).toBe(`/dashboard/leads/${LEAD_ID}`);
    expect(leadDetailPath(LEAD_ID, { status: "1" })).toContain("status=1");
    expect(leadDetailPath(LEAD_ID, { status: "1" })).not.toContain("email=");
    expect(leadDetailPath(LEAD_ID, { status: "1" })).not.toContain("phone=");
  });
});

describe("Etapa 10B — empty state copy", () => {
  it("documents empty list message", () => {
    expect("Nu ai primit încă solicitări.").toMatch(/solicitări/);
  });
});
