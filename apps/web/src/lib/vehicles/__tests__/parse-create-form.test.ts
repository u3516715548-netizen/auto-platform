import { describe, expect, it } from "vitest";
import { createVehicleInputSchema } from "@auto-platform/types";
import {
  formAttemptsTenantId,
  parseCreateVehicleForm,
} from "../parse-create-form";

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    data.set(key, value);
  }
  return data;
}

describe("parseCreateVehicleForm", () => {
  it("parses a valid payload without tenant fields", () => {
    const result = parseCreateVehicleForm(
      form({
        make: "Volkswagen",
        model: "Golf",
        year: "2022",
        mileage: "10000",
        price: "18990,50",
        currency: "EUR",
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.make).toBe("Volkswagen");
      expect(result.data.price).toBe("18990.50");
      expect(result.data.slug).toBeUndefined();
    }
  });

  it("rejects client tenant_id via strict schema", () => {
    const parsed = createVehicleInputSchema.safeParse({
      make: "Ford",
      model: "Focus",
      year: 2021,
      mileage: 1,
      price: "1000",
      currency: "EUR",
      tenant_id: "00000000-0000-4000-8000-000000000099",
    });
    expect(parsed.success).toBe(false);
  });

  it("detects smuggled tenant fields on FormData", () => {
    expect(formAttemptsTenantId(form({ make: "x", tenant_id: "abc" }))).toBe(true);
    expect(formAttemptsTenantId(form({ make: "x", tenantId: "abc" }))).toBe(true);
    expect(formAttemptsTenantId(form({ make: "x" }))).toBe(false);
  });
});
