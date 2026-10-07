import { describe, expect, it } from "vitest";
import {
  createPublicLeadInputSchema,
  PUBLIC_LEAD_CONSENT_VERSION,
} from "@auto-platform/types";
import { mapLeadNotifyResultToPersistence } from "@/lib/notifications/map-lead-notification-status";
import {
  parseConsentCheckbox,
  parsePublicLeadForm,
} from "@/lib/storefront/parse-public-lead";
import type { CreatePublicLeadState } from "@/lib/storefront/create-public-lead";

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

describe("Etapa 17 — consent + required email", () => {
  it("rejects missing consent", () => {
    expect(
      createPublicLeadInputSchema.safeParse({
        name: "Ana",
        email: "ana@example.com",
        consent: false,
      }).success,
    ).toBe(false);
    expect(
      createPublicLeadInputSchema.safeParse({
        name: "Ana",
        email: "ana@example.com",
      }).success,
    ).toBe(false);

    const parsed = parsePublicLeadForm(
      form({ name: "Ana", email: "ana@example.com" }),
    );
    expect(parsed.ok).toBe(false);
  });

  it("accepts consent + email and sets consent true", () => {
    const ok = createPublicLeadInputSchema.safeParse({
      name: "Ana",
      email: "  Ana@Example.COM ",
      consent: true,
    });
    expect(ok.success).toBe(true);
    if (ok.success) {
      expect(ok.data.email).toBe("ana@example.com");
      expect(ok.data.consent).toBe(true);
    }

    const parsed = parsePublicLeadForm(
      form({ name: "Ana", email: "Ana@Example.COM", consent: "true" }),
    );
    expect(parsed).toMatchObject({
      ok: true,
      honeypotTriggered: false,
      data: { email: "ana@example.com", consent: true },
    });
  });

  it("rejects missing or invalid email even with phone", () => {
    expect(
      createPublicLeadInputSchema.safeParse({
        name: "Ana",
        phone: "0722123456",
        consent: true,
      }).success,
    ).toBe(false);
    expect(
      createPublicLeadInputSchema.safeParse({
        name: "Ana",
        email: "not-an-email",
        consent: true,
      }).success,
    ).toBe(false);
    expect(
      parsePublicLeadForm(form({ name: "Ana", phone: "0722123456", consent: "true" })).ok,
    ).toBe(false);
  });

  it("accepts optional valid phone with required email + consent", () => {
    const ok = createPublicLeadInputSchema.safeParse({
      name: "Ana",
      email: "ana@test.ro",
      phone: "0722 123 456",
      consent: true,
    });
    expect(ok.success).toBe(true);
    if (ok.success) {
      expect(ok.data.phone).toBe("+40722123456");
    }
  });

  it("parseConsentCheckbox accepts on/true/1 only", () => {
    expect(parseConsentCheckbox("on")).toBe(true);
    expect(parseConsentCheckbox("true")).toBe(true);
    expect(parseConsentCheckbox("1")).toBe(true);
    expect(parseConsentCheckbox("")).toBe(false);
    expect(parseConsentCheckbox(null)).toBe(false);
    expect(parseConsentCheckbox("yes")).toBe(false);
  });

  it("honeypot still short-circuits without requiring email/consent", () => {
    const bot = parsePublicLeadForm(form({ name: "Bot", company: "spam" }));
    expect(bot).toMatchObject({ ok: true, honeypotTriggered: true });
  });

  it("consent version constant is v1", () => {
    expect(PUBLIC_LEAD_CONSENT_VERSION).toBe("v1");
  });
});

describe("Etapa 17 — notification status mapping", () => {
  it("maps noop/log to not_configured (never sent)", () => {
    const mapped = mapLeadNotifyResultToPersistence({
      attempted: true,
      sent: false,
      reason: "not_configured",
    });
    expect(mapped.notificationStatus).toBe("not_configured");
    expect(mapped.notificationReason).toBe("not_configured");
    expect(mapped.notificationReason).not.toMatch(/@|0722|Ana/);
  });

  it("maps no recipients", () => {
    const mapped = mapLeadNotifyResultToPersistence({
      attempted: false,
      sent: false,
      reason: "no_recipients",
    });
    expect(mapped.notificationStatus).toBe("no_recipients");
    expect(mapped.notificationReason).toBe("no_recipients");
  });

  it("maps provider error to failed; accidental sent stays not_configured", () => {
    expect(
      mapLeadNotifyResultToPersistence({
        attempted: true,
        sent: false,
        reason: "provider_error",
      }).notificationStatus,
    ).toBe("failed");

    expect(
      mapLeadNotifyResultToPersistence({
        attempted: true,
        sent: true,
        reason: "ok",
      }).notificationStatus,
    ).toBe("not_configured");
  });
});

describe("Etapa 17 — public response shape", () => {
  it("CreatePublicLeadState never includes notification or ids", () => {
    const success: CreatePublicLeadState = { error: null, success: true };
    const failure: CreatePublicLeadState = { error: "Date invalide.", success: false };
    expect(JSON.stringify(success)).not.toMatch(
      /notification|consent_at|tenant|vehicle_id|leadId/i,
    );
    expect(JSON.stringify(failure)).not.toMatch(
      /notification|not_configured|provider_error|@/i,
    );
  });
});
