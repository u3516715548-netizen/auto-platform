import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/** 32 bytes = 256 bits of entropy; hex encoding for URL-safe tokens. */
export const INVITE_TOKEN_BYTES = 32;

export function generateInviteToken(): string {
  return randomBytes(INVITE_TOKEN_BYTES).toString("hex");
}

export function hashInviteToken(rawToken: string): string {
  return createHash("sha256").update(rawToken, "utf8").digest("hex");
}

export function inviteTokensEqual(rawToken: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashInviteToken(rawToken), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

/** Opaque token from query/path — reject obviously invalid shapes early. */
export function parseInviteTokenParam(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!/^[a-f0-9]{64}$/i.test(trimmed)) return null;
  return trimmed.toLowerCase();
}
