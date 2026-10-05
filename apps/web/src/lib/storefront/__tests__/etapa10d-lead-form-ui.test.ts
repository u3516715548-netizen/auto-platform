import { describe, expect, it } from "vitest";
import {
  LEAD_FORM_COPY,
  LEAD_FORM_HEADING_ID,
  resolveLeadFormFocusTarget,
} from "../lead-form-ui";
import { STOREFRONT_CONTACT_ANCHOR_ID } from "../storefront-contact-links";

type FakeEl = HTMLElement & { id: string };

function fakeElement(id: string): FakeEl {
  return { id } as FakeEl;
}

function fakeRoot(map: Record<string, FakeEl | null>): ParentNode {
  return {
    querySelector(selector: string) {
      if (selector in map) return map[selector];
      // Support simple tag fallbacks used by resolveLeadFormFocusTarget
      for (const [key, value] of Object.entries(map)) {
        if (selector.split(",").some((part) => part.trim() === key)) {
          return value;
        }
      }
      return null;
    },
  } as ParentNode;
}

describe("Etapa 10D — public lead form UI contract", () => {
  it("keeps Romanian conversion copy and contact hint", () => {
    expect(LEAD_FORM_COPY.heading).toMatch(/Solicită informații/i);
    expect(LEAD_FORM_COPY.contactHint).toBe(
      "Completează cel puțin e-mailul sau telefonul.",
    );
    expect(LEAD_FORM_COPY.submit).toBe("Trimite solicitarea");
    expect(LEAD_FORM_COPY.success).toMatch(/Solicitarea a fost trimisă/);
    expect(LEAD_FORM_COPY.privacy).not.toMatch(/GDPR|juridic|avocat/i);
    expect(LEAD_FORM_HEADING_ID).toBe("lead-form-heading");
    expect(STOREFRONT_CONTACT_ANCHOR_ID).toBe("contact");
  });

  it("prefers lead form heading for sticky Mesaj focus", () => {
    const heading = fakeElement("lead-form-heading");
    const root = fakeRoot({
      [`#${LEAD_FORM_HEADING_ID}`]: heading,
      "h2, h3": heading,
    });
    expect(resolveLeadFormFocusTarget(root)?.id).toBe("lead-form-heading");
  });

  it("falls back to first field when heading missing", () => {
    const name = fakeElement("name");
    const root = fakeRoot({
      [`#${LEAD_FORM_HEADING_ID}`]: null,
      "h2, h3": null,
      "input:not([type='hidden']):not([tabindex='-1']), textarea, button:not([disabled])": name,
    });
    expect(resolveLeadFormFocusTarget(root)?.id).toBe("name");
  });

  it("does not invent real personal data in placeholders", () => {
    expect(LEAD_FORM_COPY.emailPlaceholder).toMatch(/^ex\./i);
    expect(LEAD_FORM_COPY.phonePlaceholder).toMatch(/^ex\./i);
    expect(LEAD_FORM_COPY.namePlaceholder).toMatch(/^ex\./i);
  });
});
