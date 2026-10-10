import { describe, expect, it } from "vitest";
import { InsufficientRoleError } from "@auto-platform/core";
import { storefrontTemplateIdSchema } from "@auto-platform/types";
import { assertRoleAllowed } from "@/lib/auth/require-role";
import {
  isStorefrontTemplateReady,
  resolveStorefrontTemplateId,
} from "@/lib/storefront/templates/registry";
import {
  BRANDING_UPDATE_ROLES,
  listChangedBrandingKeys,
  mergeTenantBranding,
} from "@/lib/tenant/branding-merge";

describe("apply storefront template guards", () => {
  it("allows ready + zod-allowlisted template-1 and template-2", () => {
    expect(isStorefrontTemplateReady("template-1")).toBe(true);
    expect(isStorefrontTemplateReady("template-2")).toBe(true);
    expect(storefrontTemplateIdSchema.safeParse("template-1").success).toBe(true);
    expect(storefrontTemplateIdSchema.safeParse("template-2").success).toBe(true);
    expect(storefrontTemplateIdSchema.safeParse("template-99").success).toBe(false);
    expect(isStorefrontTemplateReady("template-99")).toBe(false);
  });

  it("resolves live template-2 and falls back invalid to template-1", () => {
    expect(resolveStorefrontTemplateId("template-2")).toBe("template-2");
    expect(resolveStorefrontTemplateId("template-1")).toBe("template-1");
    expect(resolveStorefrontTemplateId("evil")).toBe("template-1");
    expect(resolveStorefrontTemplateId(undefined)).toBe("template-1");
  });

  it("allows owner and rejects non-owner roles for template apply", () => {
    expect(BRANDING_UPDATE_ROLES).toEqual(["owner"]);
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

  it("merges template-2 and records templateId in changedKeys for audit metadata", () => {
    const merged = mergeTenantBranding(
      {
        primaryColor: "#111111",
        templateId: "template-1",
        phone: "+40711",
        legacyNote: "keep",
      },
      {
        primaryColor: "#111111",
        templateId: "template-2",
        phone: "+40711",
        whatsapp: null,
        leadNotificationEmails: [],
      },
    );
    expect(merged.templateId).toBe("template-2");
    expect(merged.legacyNote).toBe("keep");
    const changed = listChangedBrandingKeys(
      { primaryColor: "#111111", templateId: "template-1", phone: "+40711" },
      merged,
    );
    expect(changed).toEqual(["templateId"]);
    expect(JSON.stringify(changed)).not.toContain("407");
  });
});
