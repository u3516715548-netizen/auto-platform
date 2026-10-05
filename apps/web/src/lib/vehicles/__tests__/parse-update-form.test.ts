import { describe, expect, it } from "vitest";
import {
  updateVehicleInputSchema,
  updateVehicleStatusSchema,
  vehicleIdSchema,
} from "@auto-platform/types";
import {
  parseUpdateStatusForm,
  parseUpdateVehicleForm,
  parseVehicleId,
  rejectTenantIdFromForm,
} from "../parse-update-form";

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    data.set(key, value);
  }
  return data;
}

describe("parse update / status forms", () => {
  it("parses valid update payload", () => {
    const result = parseUpdateVehicleForm(
      form({
        make: "Ford",
        model: "Focus",
        year: "2021",
        mileage: "40000",
        price: "14990",
        currency: "EUR",
        slug: "focus-2021",
      }),
    );
    expect(result.ok).toBe(true);
  });

  it("rejects tenant_id on update schema", () => {
    const parsed = updateVehicleInputSchema.safeParse({
      make: "Ford",
      model: "Focus",
      year: 2021,
      mileage: 1,
      price: "1000",
      currency: "EUR",
      slug: "focus",
      tenant_id: "00000000-0000-4000-8000-000000000099",
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts only known status enum values", () => {
    expect(updateVehicleStatusSchema.safeParse({ status: "available" }).success).toBe(true);
    expect(updateVehicleStatusSchema.safeParse({ status: "archived" }).success).toBe(true);
    expect(updateVehicleStatusSchema.safeParse({ status: "deleted" }).success).toBe(false);

    const ok = parseUpdateStatusForm(form({ status: "sold" }));
    expect(ok.ok).toBe(true);
    const bad = parseUpdateStatusForm(form({ status: "nope" }));
    expect(bad.ok).toBe(false);
  });

  it("validates vehicle id UUID and detects tenant smuggling", () => {
    expect(parseVehicleId("not-a-uuid").ok).toBe(false);
    expect(vehicleIdSchema.safeParse("00000000-0000-4000-8000-000000000001").success).toBe(true);
    expect(rejectTenantIdFromForm(form({ tenantId: "x" }))).toBeTruthy();
    expect(rejectTenantIdFromForm(form({ make: "x" }))).toBeNull();
  });
});
