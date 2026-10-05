import { describe, expect, it } from "vitest";
import {
  assessVehiclePublishReady,
  createVehicleInputSchema,
  updateVehicleInputSchema,
  vehicleCurrencySchema,
  vehicleFeaturesSchema,
} from "@auto-platform/types";
import {
  parseCreateVehicleForm,
  formAttemptsTenantId,
} from "../parse-create-form";
import {
  parseUpdateVehicleForm,
  rejectTenantIdFromForm,
} from "../parse-update-form";
import { canMutateVehicle, VEHICLE_MUTATION_ROLES } from "../permissions";

function form(entries: Record<string, string | string[]>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    if (Array.isArray(value)) {
      for (const item of value) data.append(key, item);
    } else {
      data.set(key, value);
    }
  }
  return data;
}

const completePublish = {
  make: "Volkswagen",
  model: "Golf",
  year: 2022,
  mileage: 25000,
  price: "18990",
  fuel: "diesel" as const,
  transmission: "manual" as const,
  bodyType: "hatchback" as const,
  condition: "used" as const,
  powerHp: 150,
  description:
    "Volkswagen Golf 8 din 2022, motor diesel, stare foarte bună, carte de service la zi.",
  vatRegime: "deductible" as const,
};

describe("6B EUR / km / features Zod", () => {
  it("forces create currency to EUR and rejects RON in schema", () => {
    expect(vehicleCurrencySchema.safeParse("RON").success).toBe(false);
    expect(createVehicleInputSchema.safeParse({
      make: "A",
      model: "B",
      year: 2020,
      mileage: 1,
      price: "1000",
      currency: "RON",
    }).success).toBe(false);

    const parsed = parseCreateVehicleForm(
      form({
        make: "A",
        model: "B",
        year: "2020",
        mileage: "10",
        price: "1000",
        currency: "USD",
      }),
    );
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.data.currency).toBe("EUR");
  });

  it("rejects unknown features and HTML description on update", () => {
    expect(vehicleFeaturesSchema.safeParse(["abs", "nitro"]).success).toBe(false);
    const bad = parseUpdateVehicleForm(
      form({
        make: "Ford",
        model: "Focus",
        year: "2021",
        mileage: "1000",
        price: "10000",
        slug: "focus",
        description: "<b>html</b> text lung suficient pentru validare publicare.",
        features: ["abs"],
      }),
    );
    expect(bad.ok).toBe(false);

    const ok = parseUpdateVehicleForm(
      form({
        make: "Ford",
        model: "Focus",
        year: "2021",
        mileage: "1000",
        price: "10000",
        slug: "focus",
        fuel: "petrol",
        features: ["abs", "ac"],
      }),
    );
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.data.currency).toBe("EUR");
      expect(ok.data.features).toEqual(["abs", "ac"]);
    }
  });

  it("rejects tenant_id smuggling on create/update", () => {
    expect(formAttemptsTenantId(form({ tenant_id: "x" }))).toBe(true);
    expect(rejectTenantIdFromForm(form({ tenantId: "x" }))).toBeTruthy();
    expect(
      updateVehicleInputSchema.safeParse({
        ...completePublish,
        slug: "x",
        currency: "EUR",
        features: [],
        priceNegotiable: false,
        hasServiceBook: false,
        hasServiceHistory: false,
        tenant_id: "00000000-0000-4000-8000-000000000099",
      }).success,
    ).toBe(false);
  });
});

describe("6B publish gate", () => {
  it("blocks incomplete draft and lists missing Romanian labels", () => {
    const result = assessVehiclePublishReady({
      make: "Dacia",
      model: "Logan",
      year: 2019,
      mileage: 80000,
      price: "7990",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.missingLabels).toEqual(
        expect.arrayContaining([
          "Combustibil",
          "Transmisie",
          "Caroserie",
          "Stare",
          "Putere (CP)",
          "Descriere",
          "Regim TVA",
        ]),
      );
    }
  });

  it("allows complete seed-like payload", () => {
    expect(assessVehiclePublishReady(completePublish).ok).toBe(true);
  });
});

describe("6B roles", () => {
  it("viewer cannot mutate; owner/manager/sales can", () => {
    expect(canMutateVehicle("viewer")).toBe(false);
    for (const role of VEHICLE_MUTATION_ROLES) {
      expect(canMutateVehicle(role)).toBe(true);
    }
  });
});
