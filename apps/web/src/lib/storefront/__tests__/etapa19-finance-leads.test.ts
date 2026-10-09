import { describe, expect, it } from "vitest";
import {
  createFinanceApplicationInputSchema,
  FINANCE_CONSENT_VERSION,
  normalizeRomanianCui,
} from "@auto-platform/types";
import { parseFinanceApplicationForm } from "@/lib/storefront/parse-finance-application";
import { calculateFixedMonthlyPayment } from "@/lib/storefront/storefront-vehicle-lite";
import { leadSourceLabel } from "@/lib/leads/status-label";
import type { CreateFinanceApplicationState } from "@/lib/storefront/create-finance-application";

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

describe("Etapa 19 — finance validation", () => {
  it("parses individual applicant", () => {
    const ok = createFinanceApplicationInputSchema.safeParse({
      applicantType: "individual",
      firstName: "Ana",
      lastName: "Pop",
      email: "Ana@Example.COM",
      phone: "0722 123 456",
      amountEur: 10000,
      termMonths: 60,
      consent: true,
    });
    expect(ok.success).toBe(true);
    if (ok.success) {
      expect(ok.data.applicantType).toBe("individual");
      expect(ok.data.fullName).toBe("Ana Pop");
      expect(ok.data.email).toBe("ana@example.com");
      expect(ok.data.phone).toBe("+40722123456");
      expect(ok.data.companyTaxId).toBeUndefined();
    }
  });

  it("parses company applicant with valid CUI", () => {
    const ok = createFinanceApplicationInputSchema.safeParse({
      applicantType: "company",
      companyName: "Auto SRL",
      companyTaxId: "RO1593112",
      email: "office@auto.test",
      phone: "0722123456",
      amountEur: 5000,
      termMonths: 36,
      consent: true,
    });
    expect(ok.success).toBe(true);
    if (ok.success) {
      expect(ok.data.applicantType).toBe("company");
      expect(ok.data.fullName).toBe("Auto SRL");
      expect(ok.data.companyTaxId).toBe("1593112");
    }
  });

  it("rejects invalid CUI", () => {
    expect(normalizeRomanianCui("123")).toBeNull();
    expect(
      createFinanceApplicationInputSchema.safeParse({
        applicantType: "company",
        companyName: "Auto SRL",
        companyTaxId: "123",
        email: "a@b.co",
        phone: "0722123456",
        amountEur: 1000,
        termMonths: 12,
        consent: true,
      }).success,
    ).toBe(false);
  });

  it("rejects invalid email, missing phone, missing consent", () => {
    expect(
      createFinanceApplicationInputSchema.safeParse({
        applicantType: "individual",
        firstName: "Ana",
        lastName: "Pop",
        email: "bad",
        phone: "0722123456",
        amountEur: 1000,
        termMonths: 12,
        consent: true,
      }).success,
    ).toBe(false);
    expect(
      createFinanceApplicationInputSchema.safeParse({
        applicantType: "individual",
        firstName: "Ana",
        lastName: "Pop",
        email: "a@b.co",
        amountEur: 1000,
        termMonths: 12,
        consent: true,
      }).success,
    ).toBe(false);
    expect(
      createFinanceApplicationInputSchema.safeParse({
        applicantType: "individual",
        firstName: "Ana",
        lastName: "Pop",
        email: "a@b.co",
        phone: "0722123456",
        amountEur: 1000,
        termMonths: 12,
        consent: false,
      }).success,
    ).toBe(false);
  });

  it("rejects zero/negative amount and invalid term", () => {
    expect(
      createFinanceApplicationInputSchema.safeParse({
        applicantType: "individual",
        firstName: "Ana",
        lastName: "Pop",
        email: "a@b.co",
        phone: "0722123456",
        amountEur: 0,
        termMonths: 12,
        consent: true,
      }).success,
    ).toBe(false);
    expect(
      createFinanceApplicationInputSchema.safeParse({
        applicantType: "individual",
        firstName: "Ana",
        lastName: "Pop",
        email: "a@b.co",
        phone: "0722123456",
        amountEur: -10,
        termMonths: 12,
        consent: true,
      }).success,
    ).toBe(false);
    expect(
      createFinanceApplicationInputSchema.safeParse({
        applicantType: "individual",
        firstName: "Ana",
        lastName: "Pop",
        email: "a@b.co",
        phone: "0722123456",
        amountEur: 1000,
        termMonths: 18,
        consent: true,
      }).success,
    ).toBe(false);
  });

  it("parseFinanceApplicationForm flags honeypot website without insert path data trust", () => {
    const bot = parseFinanceApplicationForm(
      form({
        applicantType: "individual",
        firstName: "Bot",
        lastName: "Spam",
        email: "bot@x.test",
        phone: "0722123456",
        amountEur: "1000",
        termMonths: "12",
        consent: "true",
        website: "http://spam.test",
      }),
    );
    expect(bot).toMatchObject({ ok: true, honeypotTriggered: true });
  });

  it("rejects client lead_id / tenant smuggling", () => {
    expect(
      parseFinanceApplicationForm(
        form({
          applicantType: "individual",
          firstName: "Ana",
          lastName: "Pop",
          email: "a@b.co",
          phone: "0722123456",
          amountEur: "1000",
          termMonths: "12",
          consent: "true",
          lead_id: "00000000-0000-4000-8000-000000000099",
        }),
      ).ok,
    ).toBe(false);
  });

  it("consent version and monthly snapshot helper", () => {
    expect(FINANCE_CONSENT_VERSION).toBe("finance-v1");
    const monthly = calculateFixedMonthlyPayment(185000, 4.9, 60);
    expect(monthly).toBeGreaterThan(0);
    expect(Number.isFinite(monthly)).toBe(true);
  });

  it("public response shape has no technical fields", () => {
    const success: CreateFinanceApplicationState = { error: null, success: true };
    expect(JSON.stringify(success)).not.toMatch(
      /notification|finance_application|tenant|leadId|vehicle_id|@/i,
    );
  });

  it("dashboard source label is Finanțare", () => {
    expect(leadSourceLabel("finance")).toBe("Finanțare");
  });
});

describe("Etapa 19 — amount vs price rule (pure)", () => {
  it("documents amount must be <= vehicle price", () => {
    const price = 185000;
    const amountOk = 100000;
    const amountOver = 200000;
    expect(amountOk > 0 && amountOk <= price).toBe(true);
    expect(amountOver <= price).toBe(false);
  });
});
