import { describe, expect, it } from "vitest";
import {
  SETTINGS_NAV,
  SETTINGS_OWNER_ROLES,
  canAccessSettingsOwnerSection,
  isCustomizationSectionActive,
  isSettingsChildActive,
  isSettingsNavActive,
  settingsNavForRole,
} from "../settings-nav";

describe("settings nav", () => {
  it("exposes settings routes with Personalizare children", () => {
    expect(SETTINGS_NAV.map((i) => i.href)).toEqual([
      "/dashboard/settings/general",
      "/dashboard/settings/team",
      "/dashboard/settings/company",
      "/dashboard/settings/customization",
    ]);
    const customization = SETTINGS_NAV.find((i) => i.href === "/dashboard/settings/customization");
    expect(customization?.children?.map((c) => c.href)).toEqual([
      "/dashboard/settings/customization/themes",
      "/dashboard/settings/customization/pages",
      "/dashboard/settings/customization/preferences",
    ]);
  });

  it("marks owner as the only settings administrator role", () => {
    expect(SETTINGS_OWNER_ROLES).toEqual(["owner"]);
    expect(canAccessSettingsOwnerSection("owner")).toBe(true);
    expect(canAccessSettingsOwnerSection("manager")).toBe(false);
    expect(canAccessSettingsOwnerSection("sales")).toBe(false);
    expect(canAccessSettingsOwnerSection("viewer")).toBe(false);
  });

  it("shows only General to non-owners", () => {
    expect(settingsNavForRole("sales").map((i) => i.href)).toEqual([
      "/dashboard/settings/general",
    ]);
    expect(settingsNavForRole("owner")).toHaveLength(4);
  });

  it("detects active leaf and customization section", () => {
    expect(
      isSettingsNavActive("/dashboard/settings/general", "/dashboard/settings/general"),
    ).toBe(true);
    expect(
      isSettingsChildActive(
        "/dashboard/settings/customization/themes",
        "/dashboard/settings/customization/themes",
      ),
    ).toBe(true);
    expect(
      isSettingsChildActive(
        "/dashboard/settings/customization/themes/preview",
        "/dashboard/settings/customization/themes",
      ),
    ).toBe(true);
    expect(isCustomizationSectionActive("/dashboard/settings/customization/pages")).toBe(true);
    expect(isCustomizationSectionActive("/dashboard/settings/general")).toBe(false);
  });
});
