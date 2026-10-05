import { describe, expect, it, vi } from "vitest";
import {
  leadNotificationEmailsSchema,
  tenantBrandingUpdateSchema,
} from "@auto-platform/types";
import { InsufficientRoleError } from "@auto-platform/core";
import { assertRoleAllowed } from "@/lib/auth/require-role";
import { parsePublicBranding } from "@/lib/storefront/public-dto";
import { toPublicTenantView, type PublicTenantRecord } from "@/lib/storefront/resolve-public-tenant";
import {
  BRANDING_UPDATE_ROLES,
  listChangedBrandingKeys,
  mergeTenantBranding,
  parseBrandingUpdateForm,
} from "@/lib/tenant/branding-merge";
import { parseLeadNotificationEmails } from "@/lib/tenant/parse-lead-notification-emails";
import { formatNewLeadsBadge } from "@/lib/leads/new-leads-badge";
import {
  NoopLeadEmailNotifier,
  buildNewLeadEmailTextBody,
  maybeNotifyAfterPublicLeadInsert,
  notifyNewLeadBestEffort,
  type LeadEmailNotifier,
} from "@/lib/notifications/lead-email";

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

describe("Etapa 10C — leadNotificationEmails contract", () => {
  it("normalizes, dedupes, allows empty, rejects invalid and >3", () => {
    expect(leadNotificationEmailsSchema.safeParse([]).success).toBe(true);
    expect(
      leadNotificationEmailsSchema.safeParse(["  Ana@Example.com ", "ana@example.com", "b@c.ro"])
        .success,
    ).toBe(true);
    expect(
      leadNotificationEmailsSchema.safeParse(["  Ana@Example.com ", "ana@example.com", "b@c.ro"])
        .data,
    ).toEqual(["ana@example.com", "b@c.ro"]);

    expect(leadNotificationEmailsSchema.safeParse(["not-email"]).success).toBe(false);
    expect(
      leadNotificationEmailsSchema.safeParse([
        "a@a.co",
        "b@b.co",
        "c@c.co",
        "d@d.co",
      ]).success,
    ).toBe(false);
  });

  it("parses from branding jsonb and stays out of public DTO", () => {
    const branding = {
      primaryColor: "#2563eb",
      templateId: "template-1",
      leadNotificationEmails: ["A@B.CO", "a@b.co", "c@d.ro"],
      secretPlan: "pro",
    };
    expect(parseLeadNotificationEmails(branding)).toEqual(["a@b.co", "c@d.ro"]);
    expect(parsePublicBranding(branding)).not.toHaveProperty("leadNotificationEmails");

    const view = toPublicTenantView({
      tenantId: "00000000-0000-4000-8000-000000000001",
      slug: "acme",
      name: "ACME",
      status: "active",
      primaryColor: "#2563eb",
      templateId: "template-1",
    } satisfies PublicTenantRecord);
    expect(view).not.toHaveProperty("leadNotificationEmails");
    expect(JSON.stringify(view)).not.toContain("a@b.co");
  });

  it("update schema requires the key; merge preserves historic unmanaged keys", () => {
    expect(
      tenantBrandingUpdateSchema.safeParse({
        primaryColor: "#2563eb",
        templateId: "template-1",
        phone: null,
        whatsapp: null,
      }).success,
    ).toBe(false);

    const merged = mergeTenantBranding(
      { legacyNote: "keep", leadNotificationEmails: ["old@x.ro"] },
      {
        primaryColor: "#0f766e",
        templateId: "template-1",
        phone: null,
        whatsapp: null,
        leadNotificationEmails: [],
      },
    );
    expect(merged.legacyNote).toBe("keep");
    expect(merged.leadNotificationEmails).toEqual([]);
    const changed = listChangedBrandingKeys(
      { leadNotificationEmails: ["old@x.ro"] },
      merged,
    );
    expect(changed).toContain("leadNotificationEmails");
    expect(JSON.stringify(changed)).not.toContain("@");
  });

  it("form parse collects up to 3 slots; owner-only roles unchanged", () => {
    const parsed = parseBrandingUpdateForm(
      form({
        primaryColor: "#2563eb",
        templateId: "template-1",
        phone: "",
        whatsapp: "",
        leadNotificationEmail1: " One@Ex.com ",
        leadNotificationEmail2: "one@ex.com",
        leadNotificationEmail3: "two@ex.com",
      }),
    );
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data.leadNotificationEmails).toEqual(["one@ex.com", "two@ex.com"]);
    }

    const bad = parseBrandingUpdateForm(
      form({
        primaryColor: "#2563eb",
        templateId: "template-1",
        leadNotificationEmail1: "bad",
      }),
    );
    expect(bad.ok).toBe(false);

    expect(BRANDING_UPDATE_ROLES).toEqual(["owner"]);
    expect(() =>
      assertRoleAllowed(
        { membershipId: "m", profileId: "p", tenantId: "t", role: "manager" },
        BRANDING_UPDATE_ROLES,
      ),
    ).toThrow(InsufficientRoleError);
  });
});

describe("Etapa 10C — email notifier best-effort", () => {
  it("skips notifier when recipients empty; calls after insert when present", async () => {
    const notify = vi.fn(async () => ({
      attempted: true,
      sent: false,
      reason: "not_configured" as const,
    }));
    const notifier: LeadEmailNotifier = { notifyNewLead: notify };

    const skipped = await maybeNotifyAfterPublicLeadInsert({
      tenantId: "t1",
      leadId: "11111111-1111-4111-8111-111111111111",
      recipients: [],
      lead: { name: "Ana" },
      notifier,
    });
    expect(skipped.reason).toBe("no_recipients");
    expect(notify).not.toHaveBeenCalled();

    await maybeNotifyAfterPublicLeadInsert({
      tenantId: "t1",
      leadId: "11111111-1111-4111-8111-111111111111",
      recipients: ["a@b.co"],
      lead: { name: "Ana", email: "ana@x.ro", phone: "+40722123456", message: "secret" },
      notifier,
    });
    expect(notify).toHaveBeenCalledTimes(1);
    const arg = notify.mock.calls[0]![0];
    expect(arg.leadId).toBe("11111111-1111-4111-8111-111111111111");
    expect(arg.dashboardLeadPath).toBe(
      "/dashboard/leads/11111111-1111-4111-8111-111111111111",
    );
  });

  it("insert path remains successful when notifier throws", async () => {
    const throwing: LeadEmailNotifier = {
      async notifyNewLead() {
        throw new Error("SMTP down");
      },
    };
    const result = await notifyNewLeadBestEffort(
      {
        tenantId: "t1",
        leadId: "11111111-1111-4111-8111-111111111111",
        dashboardLeadPath: "/dashboard/leads/11111111-1111-4111-8111-111111111111",
        recipients: ["a@b.co"],
      },
      throwing,
    );
    expect(result).toEqual({
      attempted: true,
      sent: false,
      reason: "provider_error",
    });
    expect(new NoopLeadEmailNotifier()).toBeTruthy();
    expect(buildNewLeadEmailTextBody("/dashboard/leads/x")).toContain("/dashboard/leads/x");
    expect(buildNewLeadEmailTextBody("/dashboard/leads/x")).not.toMatch(/@|0722/);
  });
});

describe("Etapa 10C — in-app new leads badge", () => {
  it("hides at 0, caps at 99+, and exposes accessible label", () => {
    expect(formatNewLeadsBadge(0).visible).toBe(false);
    expect(formatNewLeadsBadge(-1).visible).toBe(false);

    const one = formatNewLeadsBadge(1);
    expect(one).toEqual({ visible: true, display: "1", ariaLabel: "1 lead nou" });

    const twelve = formatNewLeadsBadge(12);
    expect(twelve.display).toBe("12");
    expect(twelve.ariaLabel).toBe("12 lead-uri noi");

    const many = formatNewLeadsBadge(100);
    expect(many.display).toBe("99+");
    expect(many.ariaLabel).toBe("99+ lead-uri noi");
  });

  it("documents that status new→contacted reduces badge after layout revalidate", () => {
    // Badge is computed from status=`new` count in dashboard layout.
    // updateLeadStatusAction revalidates `/dashboard` layout after status change.
    expect(formatNewLeadsBadge(2).visible).toBe(true);
    expect(formatNewLeadsBadge(1).ariaLabel).toBe("1 lead nou");
  });
});
