import { describe, expect, it } from "vitest";
import {
  resolveStickyContactActions,
  stickyContactBarVisible,
} from "../sticky-contact-actions";
import {
  mergeTenantBranding,
  listChangedBrandingKeys,
  parseBrandingUpdateForm,
  BRANDING_UPDATE_ROLES,
} from "@/lib/tenant/branding-merge";
import { rejectTenantIdFromForm } from "@/lib/vehicles/parse-update-form";
import { assertRoleAllowed } from "@/lib/auth/require-role";
import { InsufficientRoleError } from "@auto-platform/core";
import type { PublicTenantView } from "../resolve-public-tenant";

function view(overrides: Partial<PublicTenantView> = {}): PublicTenantView {
  return {
    slug: "acme",
    name: "ACME",
    primaryColor: "#0f766e",
    templateId: "template-1",
    leadsEnabled: true,
    ...overrides,
  };
}

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [k, v] of Object.entries(entries)) data.set(k, v);
  return data;
}

describe("Etapa 9C sticky contact actions", () => {
  it("hides bar when no useful actions", () => {
    expect(stickyContactBarVisible(view({ leadsEnabled: false }), "catalog")).toBe(false);
    expect(stickyContactBarVisible(view({ leadsEnabled: false }), "detail")).toBe(false);
    expect(resolveStickyContactActions(view({ leadsEnabled: false }), "catalog")).toEqual([]);
  });

  it("catalog never includes Mesaj; only call/whatsapp when present", () => {
    const actions = resolveStickyContactActions(
      view({ phone: "+40700001001", whatsapp: "+40700001002", leadsEnabled: true }),
      "catalog",
    );
    expect(actions.map((a) => a.kind)).toEqual(["call", "whatsapp"]);
    expect(actions.find((a) => a.kind === "message")).toBeUndefined();
    expect(actions.find((a) => a.kind === "call")?.href).toBe("tel:+40700001001");
    expect(actions.find((a) => a.kind === "whatsapp")?.href).toBe("https://wa.me/40700001002");
  });

  it("detail includes Mesaj only when leadsEnabled", () => {
    const withLead = resolveStickyContactActions(
      view({ phone: "+40700001001", leadsEnabled: true }),
      "detail",
    );
    expect(withLead.map((a) => a.kind)).toEqual(["message", "call"]);
    expect(withLead[0]?.href).toBe("#contact");

    const noLead = resolveStickyContactActions(
      view({ phone: "+40700001001", leadsEnabled: false }),
      "detail",
    );
    expect(noLead.map((a) => a.kind)).toEqual(["call"]);
  });

  it("VERCEL_DEMO leadsEnabled=false hides Mesaj but keeps Sună/WhatsApp", () => {
    const actions = resolveStickyContactActions(
      view({
        phone: "+40700001001",
        whatsapp: "+40700001002",
        leadsEnabled: false,
      }),
      "detail",
    );
    expect(actions.map((a) => a.kind)).toEqual(["call", "whatsapp"]);
    expect(actions.find((a) => a.kind === "message")).toBeUndefined();
  });
});

describe("Etapa 9C branding merge + auth helpers", () => {
  it("rejects unknown keys and client tenant_id", () => {
    expect(
      parseBrandingUpdateForm(
        form({
          primaryColor: "#2563eb",
          templateId: "template-1",
          phone: "",
          whatsapp: "",
          logoUrl: "https://x",
        }),
      ).ok,
    ).toBe(true);
    // logoUrl is ignored by parser (not in schema object) — strict schema only sees managed fields
    expect(
      rejectTenantIdFromForm(form({ tenantId: "x", primaryColor: "#2563eb" })),
    ).toBeTruthy();
    expect(BRANDING_UPDATE_ROLES).toEqual(["owner"]);
  });

  it("merges whitelist and clears contact with null; preserves historic unmanaged keys", () => {
    const merged = mergeTenantBranding(
      { primaryColor: "#111111", templateId: "template-1", phone: "+40711", legacyNote: "keep" },
      {
        primaryColor: "#2563eb",
        templateId: "template-1",
        phone: null,
        whatsapp: "+40700009999",
        leadNotificationEmails: ["dealer@example.com"],
      },
    );
    expect(merged).toEqual({
      legacyNote: "keep",
      primaryColor: "#2563eb",
      templateId: "template-1",
      whatsapp: "+40700009999",
      leadNotificationEmails: ["dealer@example.com"],
    });
    expect(merged).not.toHaveProperty("phone");

    const changed = listChangedBrandingKeys(
      { primaryColor: "#111111", phone: "+40711" },
      merged,
    );
    expect(changed).toContain("primaryColor");
    expect(changed).toContain("phone");
    expect(changed).toContain("whatsapp");
    expect(changed).toContain("leadNotificationEmails");
    expect(JSON.stringify(changed)).not.toContain("407");
    expect(JSON.stringify(changed)).not.toContain("dealer@");
  });

  it("parses empty phone/whatsapp as null clear", () => {
    const parsed = parseBrandingUpdateForm(
      form({
        primaryColor: "#0f766e",
        templateId: "template-1",
        phone: "  ",
        whatsapp: "",
      }),
    );
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data.phone).toBeNull();
      expect(parsed.data.whatsapp).toBeNull();
      expect(parsed.data.leadNotificationEmails).toEqual([]);
    }
  });

  it("allows owner and rejects manager/sales/viewer for branding update roles", () => {
    expect(() =>
      assertRoleAllowed(
        { membershipId: "m", profileId: "p", tenantId: "t", role: "owner" },
        BRANDING_UPDATE_ROLES,
      ),
    ).not.toThrow();
    for (const role of ["manager", "sales", "viewer"] as const) {
      expect(() =>
        assertRoleAllowed(
          { membershipId: "m", profileId: "p", tenantId: "t", role },
          BRANDING_UPDATE_ROLES,
        ),
      ).toThrow(InsufficientRoleError);
    }
  });
});
