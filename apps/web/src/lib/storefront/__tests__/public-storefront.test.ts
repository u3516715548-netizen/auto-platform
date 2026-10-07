import { describe, expect, it } from "vitest";
import { primaryColorHexSchema, createPublicLeadInputSchema } from "@auto-platform/types";
import { resolveTenantSlugFromHost } from "@/lib/tenant/resolve-tenant-from-host";
import { filterPublicSpecs, parsePublicPrimaryColor } from "../public-dto";
import {
  buildLeadCooldownCookieName,
  isLeadCooldownActive,
  leadCooldownMs,
  normalizeLeadEmail,
} from "../lead-cooldown";
import {
  formAttemptsTenantOrVehicleId,
  parsePublicLeadForm,
  parseVehicleSlugParam,
} from "../parse-public-lead";
import {
  shouldDenyPublicStorefront,
  toPublicTenantView,
  type PublicTenantRecord,
  type PublicTenantView,
  type ResolvePublicTenantResult,
} from "../resolve-public-tenant";
import { PUBLIC_VEHICLE_DTO_KEYS, type PublicVehicleDto } from "../public-dto";
import { publicCatalogPath, publicVehiclePath } from "../paths";
import {
  getPublicVehicleBySlug,
  getPublicVehicleIdForLead,
  listPublicVehicles,
} from "../public-vehicles";
import { loadPublicTenantBySlug } from "../resolve-public-tenant";

const ROOT = "localhost:3000";

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

const PUBLIC_TENANT_VIEW_KEYS = [
  "slug",
  "name",
  "primaryColor",
  "templateId",
  "leadsEnabled",
] as const;
describe("public DTO whitelist", () => {
  it("accepts validated hex primaryColor only", () => {
    expect(parsePublicPrimaryColor({ primaryColor: "#0f766e" })).toBe("#0f766e");
    expect(parsePublicPrimaryColor({ primaryColor: "#abc" })).toBe("#abc");
    expect(parsePublicPrimaryColor({ primaryColor: "red" })).toBeNull();
    expect(parsePublicPrimaryColor({ primaryColor: "#gg0000" })).toBeNull();
    expect(parsePublicPrimaryColor({ logoUrl: "https://evil" })).toBeNull();
    expect(parsePublicPrimaryColor({ primaryColor: "#0f766e", plan: "pro" })).toBe("#0f766e");
    expect(parsePublicPrimaryColor("not-an-object")).toBeNull();
    expect(primaryColorHexSchema.safeParse("#0F766E").success).toBe(true);
    expect(primaryColorHexSchema.safeParse("0f766e").success).toBe(false);
  });

  it("filters specs to plain safe values", () => {
    expect(
      filterPublicSpecs({
        fuel: "diesel",
        seats: 5,
        turbo: true,
        nested: { a: 1 },
        "": "x",
        "bad key": "x",
        long: "x".repeat(200),
      }),
    ).toEqual({ fuel: "diesel", seats: 5, turbo: true });
  });

  it("toPublicTenantView never exposes id/status/plan/domain/raw branding", () => {
    const active: PublicTenantRecord = {
      tenantId: "00000000-0000-4000-8000-000000000001",
      slug: "acme",
      name: "ACME",
      status: "active",
      primaryColor: "#0f766e",
      templateId: "template-1",
    };
    const trial: PublicTenantRecord = { ...active, status: "trial", slug: "trial-co" };

    const activeView = toPublicTenantView(active);
    expect(Object.keys(activeView).sort()).toEqual([...PUBLIC_TENANT_VIEW_KEYS].sort());
    expect(activeView).toEqual({
      slug: "acme",
      name: "ACME",
      primaryColor: "#0f766e",
      templateId: "template-1",
      leadsEnabled: true,
    });
    expect(activeView).not.toHaveProperty("tenantId");
    expect(activeView).not.toHaveProperty("id");
    expect(activeView).not.toHaveProperty("status");
    expect(activeView).not.toHaveProperty("plan");
    expect(activeView).not.toHaveProperty("customDomain");
    expect(activeView).not.toHaveProperty("branding");

    const trialView = toPublicTenantView(trial);
    expect(trialView.leadsEnabled).toBe(false);
    expect(trialView).not.toHaveProperty("status");
  });

  it("PublicVehicleDto shape excludes id/vin/tenantId/status/specs", () => {
    const dto: PublicVehicleDto = {
      slug: "golf-8",
      make: "VW",
      model: "Golf",
      year: 2022,
      mileage: 1,
      price: "1.00",
      currency: "EUR",
      fuel: "diesel",
      transmission: null,
      bodyType: null,
      condition: null,
      powerHp: null,
      description: null,
      driveType: null,
      engineDisplacementCc: null,
      emissionStandard: null,
      doors: null,
      seats: null,
      exteriorColor: null,
      interiorColor: null,
      firstRegistrationYear: null,
      firstRegistrationMonth: null,
      priceNegotiable: false,
      vatRegime: null,
      originCountry: null,
      locationCity: null,
      warrantyMonths: null,
      warrantyNotes: null,
      hasServiceBook: false,
      hasServiceHistory: false,
      accidentStatus: null,
      features: [],
    };
    expect(Object.keys(dto).sort()).toEqual([...PUBLIC_VEHICLE_DTO_KEYS].sort());
    expect(dto).not.toHaveProperty("id");
    expect(dto).not.toHaveProperty("vin");
    expect(dto).not.toHaveProperty("tenantId");
    expect(dto).not.toHaveProperty("status");
    expect(dto).not.toHaveProperty("specs");
  });
});

describe("host / tenant publishability → safe deny", () => {
  it("invalid host and missing tenant map to deny; apex does not", () => {
    expect(resolveTenantSlugFromHost("evil.com", ROOT).kind).toBe("invalid");
    expect(resolveTenantSlugFromHost("nope.localhost:3000", ROOT)).toEqual({
      kind: "tenant",
      slug: "nope",
    });
    expect(resolveTenantSlugFromHost("localhost:3000", ROOT).kind).toBe("apex");

    const denied: ResolvePublicTenantResult = { kind: "not_found" };
    expect(shouldDenyPublicStorefront(denied)).toBe(true);
    expect(shouldDenyPublicStorefront({ kind: "apex" })).toBe(false);
    expect(
      shouldDenyPublicStorefront({
        kind: "ok",
        tenant: {
          tenantId: "00000000-0000-4000-8000-000000000001",
          slug: "acme",
          name: "ACME",
          status: "active",
          primaryColor: "#2563eb",
          templateId: "template-1",
        },
      }),
    ).toBe(false);
  });

  it("null vehicle detail is the 404 signal for foreign/unavailable slug", () => {
    // Pages call notFound() when getPublicVehicleBySlug returns null.
    const missing: PublicVehicleDto | null = null;
    expect(missing).toBeNull();
    expect(parseVehicleSlugParam("focus-beta")).toBe("focus-beta");
    expect(parseVehicleSlugParam("no-such")).toBe("no-such");
    expect(parseVehicleSlugParam("BAD_SLUG")).toBeNull();
  });

  it("uses relative public paths only", () => {
    expect(publicCatalogPath()).toBe("/");
    expect(publicVehiclePath("golf-8")).toBe("/vehicles/golf-8");
    expect(publicVehiclePath("golf-8").startsWith("http")).toBe(false);
  });
});

describe("lead form availability: active vs trial", () => {
  it("leadsEnabled true only for active tenant status", () => {
    const base = {
      tenantId: "00000000-0000-4000-8000-000000000001",
      slug: "acme",
      name: "ACME",
      primaryColor: "#2563eb",
      templateId: "template-1" as const,
    };
    const activeView: PublicTenantView = toPublicTenantView({ ...base, status: "active" });
    const trialView: PublicTenantView = toPublicTenantView({
      ...base,
      slug: "trial-co",
      status: "trial",
    });
    expect(activeView.leadsEnabled).toBe(true);
    expect(trialView.leadsEnabled).toBe(false);
  });

  it("VERCEL_DEMO publicLeadsDisabled forces leadsEnabled false without changing Host contract", () => {
    const active = toPublicTenantView(
      {
        tenantId: "00000000-0000-4000-8000-000000000001",
        slug: "acme",
        name: "ACME",
        status: "active",
        primaryColor: "#2563eb",
        templateId: "template-1",
        phone: "+40700001001",
      },
      { publicLeadsDisabled: true },
    );
    expect(active.leadsEnabled).toBe(false);
    expect(active.phone).toBe("+40700001001");
  });
});

describe("public lead parse + anti-abuse", () => {
  it("rejects client tenant_id / vehicle_id smuggling; association stays server-side", () => {
    expect(formAttemptsTenantOrVehicleId(form({ tenant_id: "x" }))).toBe(true);
    expect(formAttemptsTenantOrVehicleId(form({ tenantId: "x" }))).toBe(true);
    expect(formAttemptsTenantOrVehicleId(form({ vehicle_id: "x" }))).toBe(true);
    expect(formAttemptsTenantOrVehicleId(form({ vehicleId: "x" }))).toBe(true);
    expect(formAttemptsTenantOrVehicleId(form({ name: "Ana" }))).toBe(false);

    expect(parsePublicLeadForm(form({ name: "Ana", tenant_id: "x" })).ok).toBe(false);
    expect(parsePublicLeadForm(form({ name: "Ana", vehicleId: "x" })).ok).toBe(false);

    // Zod schema is strict — extra association fields never accepted.
    expect(
      createPublicLeadInputSchema.safeParse({
        name: "Ana",
        tenant_id: "00000000-0000-4000-8000-000000000099",
      }).success,
    ).toBe(false);
    expect(
      createPublicLeadInputSchema.safeParse({
        name: "Ana",
        vehicle_id: "00000000-0000-4000-8000-000000000088",
      }).success,
    ).toBe(false);
  });

  it("Zod validates name/email/phone/message/consent (email + consent required)", () => {
    expect(createPublicLeadInputSchema.safeParse({ name: "" }).success).toBe(false);
    expect(
      createPublicLeadInputSchema.safeParse({
        name: "Ana",
        email: "bad",
        consent: true,
      }).success,
    ).toBe(false);
    expect(
      createPublicLeadInputSchema.safeParse({
        name: "Ana",
        email: "",
        phone: "",
        message: "",
        consent: true,
      }).success,
    ).toBe(false);
    expect(
      createPublicLeadInputSchema.safeParse({
        name: "Ana",
        email: "ana@example.com",
        message: "",
        consent: true,
      }).success,
    ).toBe(true);
    expect(
      createPublicLeadInputSchema.safeParse({
        name: "Ana",
        email: "ana@example.com",
        message: "x".repeat(2001),
        phone: "0722123456",
        consent: true,
      }).success,
    ).toBe(false);
    expect(
      createPublicLeadInputSchema.safeParse({
        name: "Ana",
        email: "ana@example.com",
        consent: false,
      }).success,
    ).toBe(false);
  });

  it("parses valid lead and flags honeypot without failing schema", () => {
    const ok = parsePublicLeadForm(
      form({
        name: "Ana",
        email: "ana@example.com",
        phone: "",
        message: "",
        consent: "true",
      }),
    );
    expect(ok).toMatchObject({
      ok: true,
      honeypotTriggered: false,
      data: { name: "Ana", email: "ana@example.com", phone: undefined, consent: true },
    });

    const bot = parsePublicLeadForm(form({ name: "Bot", company: "spam-co" }));
    expect(bot).toMatchObject({ ok: true, honeypotTriggered: true });
    if (bot.ok) {
      // Honeypot success path must not rely on client association fields.
      expect(bot.data).not.toHaveProperty("tenantId");
      expect(bot.data).not.toHaveProperty("vehicleId");
    }
  });

  it("cooldown cookie activates within 5 minute window", () => {
    expect(leadCooldownMs()).toBe(5 * 60 * 1000);
    const name = buildLeadCooldownCookieName("golf-8", normalizeLeadEmail("Ana@Example.com"));
    expect(name.startsWith("sf_lead_cd_")).toBe(true);
    const now = 1_000_000;
    expect(isLeadCooldownActive(String(now - 60_000), now)).toBe(true);
    expect(isLeadCooldownActive(String(now - 6 * 60_000), now)).toBe(false);
    expect(isLeadCooldownActive(undefined, now)).toBe(false);
  });

  it("parses vehicle slug params safely", () => {
    expect(parseVehicleSlugParam("golf-8-acme")).toBe("golf-8-acme");
    expect(parseVehicleSlugParam("BAD")).toBeNull();
    expect(parseVehicleSlugParam("")).toBeNull();
  });
});

describe("public catalog/detail online (DATABASE_URL)", () => {
  const hasDb = Boolean(process.env.DATABASE_URL);

  it.skipIf(!hasDb)("ensures trial/suspended fixtures then denies missing/suspended", async () => {
    const { getDb, tenants } = await import("@auto-platform/db");
    const { eq } = await import("drizzle-orm");
    const db = getDb();

    await db
      .insert(tenants)
      .values([
        {
          name: "E5 Trial Dealer",
          slug: "e5-trial-public",
          status: "trial",
          plan: "starter",
          branding: { primaryColor: "#0ea5e9" },
        },
        {
          name: "E5 Suspended Dealer",
          slug: "e5-suspended-public",
          status: "suspended",
          plan: "starter",
          branding: { primaryColor: "#dc2626" },
        },
      ])
      .onConflictDoNothing({ target: tenants.slug });

    await db.update(tenants).set({ status: "trial" }).where(eq(tenants.slug, "e5-trial-public"));
    await db
      .update(tenants)
      .set({ status: "suspended" })
      .where(eq(tenants.slug, "e5-suspended-public"));

    // Reserved vehicle fixture for unavailable → null path
    const acme = await loadPublicTenantBySlug("acme");
    expect(acme.kind).toBe("ok");
    if (acme.kind === "ok") {
      const { vehicles } = await import("@auto-platform/db");
      const { and } = await import("drizzle-orm");
      await db
        .insert(vehicles)
        .values({
          tenantId: acme.tenant.tenantId,
          status: "reserved",
          slug: "e5-acme-reserved-public",
          make: "Skoda",
          model: "Octavia",
          year: 2020,
          mileage: 50000,
          price: "12990.00",
          currency: "EUR",
          specs: {},
        })
        .onConflictDoNothing({ target: [vehicles.tenantId, vehicles.slug] });
      await db
        .update(vehicles)
        .set({ status: "reserved" })
        .where(
          and(
            eq(vehicles.tenantId, acme.tenant.tenantId),
            eq(vehicles.slug, "e5-acme-reserved-public"),
          ),
        );
    }

    const missing = await loadPublicTenantBySlug("no-such-tenant-zzzz");
    expect(missing).toEqual({ kind: "not_found" });
    expect(shouldDenyPublicStorefront(missing)).toBe(true);

    const suspended = await loadPublicTenantBySlug("e5-suspended-public");
    expect(suspended).toEqual({ kind: "not_found" });
    expect(shouldDenyPublicStorefront(suspended)).toBe(true);
  });

  it.skipIf(!hasDb)("active acme resolves with leads; trial resolves without leads", async () => {
    const acme = await loadPublicTenantBySlug("acme");
    expect(acme.kind).toBe("ok");
    if (acme.kind === "ok") {
      expect(acme.tenant.slug).toBe("acme");
      expect(acme.tenant.status).toBe("active");
      const view = toPublicTenantView(acme.tenant);
      expect(view.leadsEnabled).toBe(true);
      expect(view).not.toHaveProperty("tenantId");
    }

    const trial = await loadPublicTenantBySlug("e5-trial-public");
    expect(trial.kind).toBe("ok");
    if (trial.kind === "ok") {
      expect(trial.tenant.status).toBe("trial");
      expect(toPublicTenantView(trial.tenant).leadsEnabled).toBe(false);
    }
  });

  it.skipIf(!hasDb)("ACME/BETA catalogs are isolated; only available; foreign slug → null", async () => {
    const acme = await loadPublicTenantBySlug("acme");
    const beta = await loadPublicTenantBySlug("beta");
    expect(acme.kind).toBe("ok");
    expect(beta.kind).toBe("ok");
    if (acme.kind !== "ok" || beta.kind !== "ok") return;

    const acmeList = await listPublicVehicles(acme.tenant.tenantId);
    const betaList = await listPublicVehicles(beta.tenant.tenantId);

    expect(acmeList.every((v) => typeof v.slug === "string")).toBe(true);
    expect(acmeList.some((v) => v.slug === "koenigsegg-ccx")).toBe(true);
    expect(acmeList.some((v) => v.slug === "audi-rs6")).toBe(true);
    expect(acmeList.some((v) => v.slug === "maserati-granturismo")).toBe(true);
    expect(acmeList.some((v) => v.slug === "golf-8-acme")).toBe(false);
    expect(acmeList.some((v) => v.slug === "draft-incomplet-acme")).toBe(false);
    expect(acmeList.some((v) => v.slug === "focus-beta")).toBe(false);
    expect(betaList.some((v) => v.slug === "focus-beta")).toBe(true);
    expect(betaList.some((v) => v.slug === "golf-8-acme")).toBe(false);

    for (const row of [...acmeList, ...betaList]) {
      expect(Object.keys(row).sort()).toEqual([...PUBLIC_VEHICLE_DTO_KEYS].sort());
      expect(row).not.toHaveProperty("id");
      expect(row).not.toHaveProperty("vin");
      expect(row).not.toHaveProperty("tenantId");
      expect(row).not.toHaveProperty("status");
      expect(row).not.toHaveProperty("specs");
      expect(row.currency).toBe("EUR");
    }

    const showcase = acmeList.find((v) => v.slug === "koenigsegg-ccx");
    expect(showcase?.fuel).toBe("petrol");
    expect(showcase?.features.length).toBeGreaterThan(0);
    expect(
      showcase?.features.every((f) => typeof f.label === "string" && f.label.length > 0),
    ).toBe(true);
    expect(showcase?.description).toMatch(/Hypercar|roșu|rosu/i);

    expect(await getPublicVehicleBySlug(acme.tenant.tenantId, "draft-incomplet-acme")).toBeNull();
    expect(await getPublicVehicleBySlug(acme.tenant.tenantId, "focus-beta")).toBeNull();
    expect(await getPublicVehicleBySlug(acme.tenant.tenantId, "no-such-vehicle-zzzz")).toBeNull();
    expect(await getPublicVehicleBySlug(acme.tenant.tenantId, "e5-acme-reserved-public")).toBeNull();
    expect(await getPublicVehicleBySlug(acme.tenant.tenantId, "golf-8-acme")).toBeNull();
    expect(await getPublicVehicleIdForLead(acme.tenant.tenantId, "focus-beta")).toBeNull();
    expect(await getPublicVehicleIdForLead(acme.tenant.tenantId, "golf-8-acme")).toBeNull();

    const own = await getPublicVehicleBySlug(acme.tenant.tenantId, "koenigsegg-ccx");
    expect(own?.slug).toBe("koenigsegg-ccx");
    const leadVehicleId = await getPublicVehicleIdForLead(acme.tenant.tenantId, "koenigsegg-ccx");
    expect(typeof leadVehicleId).toBe("string");
    expect(own).not.toHaveProperty("id");
  });
});
