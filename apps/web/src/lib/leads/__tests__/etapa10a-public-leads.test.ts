import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createPublicLeadInputSchema,
  publicLeadEmailFieldSchema,
  publicLeadPhoneFieldSchema,
} from "@auto-platform/types";
import { buildLeadContactKey } from "../lead-contact";
import { LEAD_CONTACT_DEDUP_MS } from "../lead-contact-dedup";
import {
  createInMemoryPublicLeadRateLimitBackend,
  PUBLIC_LEAD_ACCEPT_LIMIT,
  PUBLIC_LEAD_ATTEMPT_LIMIT,
  resetPublicLeadRateLimitBackendForTests,
  setPublicLeadRateLimitBackendForTests,
} from "../public-lead-rate-limit";
import {
  getTrustedClientIp,
  hashClientIpForRateLimit,
} from "../trusted-client-ip";
import {
  buildLeadCooldownCookieName,
  normalizeLeadEmail,
} from "@/lib/storefront/lead-cooldown";
import { parsePublicLeadForm } from "@/lib/storefront/parse-public-lead";

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

describe("Etapa 10A — contact contract", () => {
  it("accepts email-only, phone-only, and both with normalization", () => {
    const emailOnly = createPublicLeadInputSchema.safeParse({
      name: "Ana",
      email: "  Ana@Example.COM ",
    });
    expect(emailOnly.success).toBe(true);
    if (emailOnly.success) {
      expect(emailOnly.data.email).toBe("ana@example.com");
      expect(emailOnly.data.phone).toBeUndefined();
    }

    const phoneOnly = createPublicLeadInputSchema.safeParse({
      name: "Ana",
      phone: "0722 123 456",
    });
    expect(phoneOnly.success).toBe(true);
    if (phoneOnly.success) {
      expect(phoneOnly.data.phone).toBe("+40722123456");
    }

    const both = createPublicLeadInputSchema.safeParse({
      name: "Ana",
      email: "ana@test.ro",
      phone: "+40 722 999 888",
    });
    expect(both.success).toBe(true);
    if (both.success) {
      expect(both.data.email).toBe("ana@test.ro");
      expect(both.data.phone).toBe("+40722999888");
    }
  });

  it("rejects no contact, invalid email without phone, invalid phone without email", () => {
    expect(createPublicLeadInputSchema.safeParse({ name: "Ana" }).success).toBe(false);
    expect(
      createPublicLeadInputSchema.safeParse({ name: "Ana", email: "not-an-email" }).success,
    ).toBe(false);
    expect(
      createPublicLeadInputSchema.safeParse({ name: "Ana", phone: "https://evil.test/x" }).success,
    ).toBe(false);
    expect(
      createPublicLeadInputSchema.safeParse({
        name: "Ana",
        email: "bad",
        phone: "123",
      }).success,
    ).toBe(false);
  });

  it("parsePublicLeadForm normalizes contact fields", () => {
    const parsed = parsePublicLeadForm(
      form({ name: "Ana", email: "Ana@Example.COM", phone: "0722123456" }),
    );
    expect(parsed).toMatchObject({
      ok: true,
      data: { email: "ana@example.com", phone: "+40722123456" },
    });
  });

  it("public lead field schemas reject markup in phone", () => {
    expect(publicLeadPhoneFieldSchema.safeParse("wa.me/123").success).toBe(false);
    expect(publicLeadEmailFieldSchema.safeParse("a@b.co").success).toBe(true);
  });
});

describe("Etapa 10A — honeypot", () => {
  it("flags honeypot without failing schema and keeps generic success path data", () => {
    const bot = parsePublicLeadForm(
      form({ name: "Bot", email: "bot@spam.test", company: "Acme Inc" }),
    );
    expect(bot).toMatchObject({ ok: true, honeypotTriggered: true });
  });

  it("honeypot bypasses contact validation (no email/phone required for bots)", () => {
    const bot = parsePublicLeadForm(form({ name: "Bot", company: "spam-co" }));
    expect(bot).toMatchObject({ ok: true, honeypotTriggered: true });
  });
});

describe("Etapa 10A — cooldown / contact key", () => {
  it("builds cooldown cookie from slug + contact key (email or phone)", () => {
    const emailKey = buildLeadContactKey("a@b.co", undefined);
    const phoneKey = buildLeadContactKey(undefined, "+40722123456");
    expect(buildLeadCooldownCookieName("golf-8", emailKey)).toMatch(/^sf_lead_cd_/);
    expect(buildLeadCooldownCookieName("golf-8", phoneKey)).not.toBe(
      buildLeadCooldownCookieName("golf-8", emailKey),
    );
    expect(normalizeLeadEmail("A@B.C")).toBe("a@b.c");
  });

  it("dedup window is 30 minutes", () => {
    expect(LEAD_CONTACT_DEDUP_MS).toBe(30 * 60 * 1000);
  });
});

describe("Etapa 10A — trusted IP + hashing", () => {
  const env = process.env;

  beforeEach(() => {
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("TRUSTED_PROXY", "");
  });

  afterEach(() => {
    process.env.VERCEL = env.VERCEL;
    process.env.TRUSTED_PROXY = env.TRUSTED_PROXY;
  });

  it("does not trust X-Forwarded-For without trusted proxy env", () => {
    expect(
      getTrustedClientIp(() => "203.0.113.10, 10.0.0.1"),
    ).toBeNull();
  });

  it("reads IP from x-vercel-forwarded-for on Vercel", () => {
    vi.stubEnv("VERCEL", "1");
    expect(
      getTrustedClientIp((name) =>
        name === "x-vercel-forwarded-for" ? "203.0.113.55" : null,
      ),
    ).toBe("203.0.113.55");
  });

  it("reads IP from x-real-ip when TRUSTED_PROXY=1", () => {
    vi.stubEnv("TRUSTED_PROXY", "1");
    expect(getTrustedClientIp((name) => (name === "x-real-ip" ? "198.51.100.2" : null))).toBe(
      "198.51.100.2",
    );
  });

  it("hashClientIpForRateLimit never equals raw IP and is stable", () => {
    const ip = "203.0.113.99";
    const hash = hashClientIpForRateLimit(ip);
    expect(hash).not.toContain(ip);
    expect(hash).toHaveLength(32);
    expect(hashClientIpForRateLimit(ip)).toBe(hash);
  });
});

describe("Etapa 10A — rate limit (in-memory backend)", () => {
  let backend: ReturnType<typeof createInMemoryPublicLeadRateLimitBackend>;

  beforeEach(() => {
    backend = createInMemoryPublicLeadRateLimitBackend();
    setPublicLeadRateLimitBackendForTests(backend);
  });

  afterEach(() => {
    resetPublicLeadRateLimitBackendForTests();
  });

  const scope = { tenantId: "tenant-a", ipHash: "abc123" };

  it("blocks after attempt limit with retryAfterSeconds (429 semantics)", () => {
    const start = 1_000_000;
    for (let i = 0; i < PUBLIC_LEAD_ATTEMPT_LIMIT; i++) {
      expect(backend.checkAttempt(scope, start + i).allowed).toBe(true);
      backend.recordAttempt(scope, start + i);
    }
    const blocked = backend.checkAttempt(scope, start + PUBLIC_LEAD_ATTEMPT_LIMIT);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("blocks after accept limit per hour", () => {
    const start = 2_000_000;
    for (let i = 0; i < PUBLIC_LEAD_ACCEPT_LIMIT; i++) {
      backend.recordAccept(scope, start + i * 1000);
    }
    const blocked = backend.checkAccept(scope, start + 5000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeDefined();
  });

  it("scopes limits by tenant and ip hash", () => {
    const other = { tenantId: "tenant-b", ipHash: "abc123" };
    backend.recordAttempt(scope, Date.now());
    expect(backend.checkAttempt(other, Date.now()).allowed).toBe(true);
  });
});
