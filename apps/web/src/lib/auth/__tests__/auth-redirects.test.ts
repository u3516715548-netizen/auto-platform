import { describe, expect, it } from "vitest";
import {
  dashboardPath,
  loginPath,
  resolvePostLoginPath,
  resolveUnauthenticatedDashboardPath,
} from "../auth-redirects";

describe("auth redirects (tenant-aware relative paths)", () => {
  it("post-login goes to /dashboard (same host)", () => {
    expect(resolvePostLoginPath()).toBe("/dashboard");
    expect(dashboardPath()).toBe("/dashboard");
  });

  it("unauthenticated dashboard goes to /login on same host", () => {
    expect(resolveUnauthenticatedDashboardPath()).toBe("/login?auth=required");
  });

  it("loginPath never points at an absolute apex URL", () => {
    const path = loginPath({ auth: "required" });
    expect(path.startsWith("/")).toBe(true);
    expect(path.includes("localhost")).toBe(false);
    expect(path.includes("http")).toBe(false);
  });
});
