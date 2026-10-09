import { describe, expect, it } from "vitest";
import {
  generateInviteToken,
  hashInviteToken,
  inviteTokensEqual,
  INVITE_TOKEN_BYTES,
  parseInviteTokenParam,
} from "../invite-token";
import {
  createTenantInvitationInputSchema,
  INVITABLE_MEMBERSHIP_ROLES,
  normalizeInvitationEmail,
} from "@auto-platform/types";
import { sanitizeInviteNextPath, inviteAcceptPath } from "../invite-paths";

describe("invite token security", () => {
  it("generates >= 256-bit hex tokens", () => {
    const token = generateInviteToken();
    expect(token).toMatch(/^[a-f0-9]{64}$/);
    expect(Buffer.from(token, "hex").length).toBe(INVITE_TOKEN_BYTES);
    expect(INVITE_TOKEN_BYTES * 8).toBeGreaterThanOrEqual(256);
  });

  it("hashes deterministically and mismatches differ", () => {
    const a = generateInviteToken();
    const b = generateInviteToken();
    expect(hashInviteToken(a)).toBe(hashInviteToken(a));
    expect(hashInviteToken(a)).not.toBe(hashInviteToken(b));
    expect(inviteTokensEqual(a, hashInviteToken(a))).toBe(true);
    expect(inviteTokensEqual(a, hashInviteToken(b))).toBe(false);
  });

  it("parses only opaque 64-hex tokens", () => {
    expect(parseInviteTokenParam(null)).toBeNull();
    expect(parseInviteTokenParam("short")).toBeNull();
    expect(parseInviteTokenParam("../x")).toBeNull();
    const t = generateInviteToken();
    expect(parseInviteTokenParam(t.toUpperCase())).toBe(t);
  });
});

describe("invitation email + role allowlist", () => {
  it("normalizes email lowercase/trim", () => {
    expect(normalizeInvitationEmail("  Alice@Acme.TEST ")).toBe("alice@acme.test");
    expect(normalizeInvitationEmail("not-an-email")).toBeNull();
    expect(normalizeInvitationEmail("")).toBeNull();
  });

  it("accepts invitable roles only", () => {
    expect(INVITABLE_MEMBERSHIP_ROLES).toEqual(["manager", "sales", "viewer"]);
    expect(
      createTenantInvitationInputSchema.safeParse({
        email: "x@y.z",
        role: "manager",
      }).success,
    ).toBe(true);
    expect(
      createTenantInvitationInputSchema.safeParse({
        email: "x@y.z",
        role: "owner",
      }).success,
    ).toBe(false);
    expect(
      createTenantInvitationInputSchema.safeParse({
        email: "x@y.z",
        role: "admin",
      }).success,
    ).toBe(false);
  });
});

describe("invite paths", () => {
  it("builds relative accept path without leaking host", () => {
    const t = "a".repeat(64);
    const path = inviteAcceptPath(t);
    expect(path).toBe(`/invite/${t}`);
    expect(path.includes("http")).toBe(false);
  });

  it("sanitizes next only for invite accept paths", () => {
    const t = "b".repeat(64);
    expect(sanitizeInviteNextPath(`/invite/${t}`)).toBe(`/invite/${t}`);
    expect(sanitizeInviteNextPath("https://evil.test/invite/" + t)).toBeNull();
    expect(sanitizeInviteNextPath("/dashboard")).toBeNull();
    expect(sanitizeInviteNextPath("//evil/invite/" + t)).toBeNull();
  });
});

describe("neutral responses (no token/uuid in public messages)", () => {
  it("team action messages do not embed tokens", async () => {
    const { TEAM_NEUTRAL_ERROR, TEAM_NEUTRAL_EXISTS } = await import("../team-action-state");
    expect(TEAM_NEUTRAL_ERROR.toLowerCase()).not.toMatch(/token|uuid|hash/);
    expect(TEAM_NEUTRAL_EXISTS.toLowerCase()).not.toMatch(/token|uuid|hash/);
  });
});
