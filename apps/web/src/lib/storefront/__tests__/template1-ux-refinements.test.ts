import { describe, expect, it } from "vitest";
import {
  isCompareCtaEnabled,
  shouldShowCompareBar,
} from "@/components/storefront/compare-floating-bar";
import { resolveVehicleShareMode } from "@/components/storefront/vehicle-share-button";
import { VEHICLE_DETAIL_SECTIONS } from "@/components/storefront/vehicle-detail-section-nav";
import {
  DEMO_VEHICLES,
  listDemoVehicleAlternatives,
} from "@/lib/storefront/demo/demo-storefront-data";
import { filterPublicAlternativeRows } from "@/lib/storefront/public-vehicle-alternatives";
import {
  COMPARE_MAX,
  COMPARE_MIN,
  estimateMonthlyRateEur,
} from "@/lib/storefront/storefront-vehicle-lite";

const DESCRIPTION_EMPTY_RO =
  "Descrierea pentru acest vehicul va fi adăugată în curând.";

describe("Template 1 UX refinements", () => {
  describe("Rate de la", () => {
    it("uses price / 60 rounded; hides without price", () => {
      expect(estimateMonthlyRateEur("30000")).toBe(500);
      expect(estimateMonthlyRateEur(null)).toBeNull();
    });
  });

  describe("compare bar rules", () => {
    it("requires min 2 for Compară CTA and max 4 selection", () => {
      expect(COMPARE_MIN).toBe(2);
      expect(COMPARE_MAX).toBe(4);
      expect(isCompareCtaEnabled(1)).toBe(false);
      expect(isCompareCtaEnabled(2)).toBe(true);
      expect(isCompareCtaEnabled(4)).toBe(true);
    });

    it("shows bar whenever there is selection and not hidden; closes when empty", () => {
      expect(shouldShowCompareBar(1, false)).toBe(true);
      expect(shouldShowCompareBar(4, false)).toBe(true);
      expect(shouldShowCompareBar(0, false)).toBe(false);
      expect(shouldShowCompareBar(2, true)).toBe(false);
    });

    it("exposes a remove control for every selected vehicle (1–4)", () => {
      for (const count of [1, 2, 3, 4] as const) {
        const slugs = Array.from({ length: count }, (_, i) => `v-${i}`);
        const removeLabels = slugs.map((slug) => `Elimină ${slug} din comparație`);
        expect(removeLabels).toHaveLength(count);
        expect(shouldShowCompareBar(count, false)).toBe(true);
      }
    });
  });

  describe("share", () => {
    it("picks Web Share when available, otherwise clipboard", () => {
      expect(resolveVehicleShareMode(true)).toBe("web-share");
      expect(resolveVehicleShareMode(false)).toBe("clipboard");
    });
  });

  describe("detail section tabs", () => {
    it("keeps Finanțare, Tehnic + Dotări, Descriere as in-page section targets", () => {
      expect(VEHICLE_DETAIL_SECTIONS.map((s) => s.id)).toEqual([
        "vehicle-section-finance",
        "vehicle-section-tech",
        "vehicle-section-description",
      ]);
      expect(VEHICLE_DETAIL_SECTIONS.map((s) => `${s.num}. ${s.label}`)).toEqual([
        "01. Finanțare",
        "02. Tehnic + Dotări",
        "03. Descriere",
      ]);
    });

    it("documents Romanian empty state for missing description", () => {
      expect(DESCRIPTION_EMPTY_RO).toContain("Descrierea");
      expect(DESCRIPTION_EMPTY_RO).toContain("curând");
    });
  });

  describe("public alternatives filter", () => {
    it("keeps only same-tenant available rows and excludes current slug", () => {
      const tenantA = "tenant-a";
      const rows = [
        { tenantId: tenantA, status: "available", slug: "car-1" },
        { tenantId: tenantA, status: "available", slug: "current" },
        { tenantId: tenantA, status: "sold", slug: "car-2" },
        { tenantId: "other", status: "available", slug: "car-3" },
        { tenantId: tenantA, status: "available", slug: "car-4" },
      ];
      expect(
        filterPublicAlternativeRows(rows, tenantA, "current").map((r) => r.slug),
      ).toEqual(["car-1", "car-4"]);
    });
  });

  describe("demo alternatives", () => {
    it("excludes current demo vehicle and never exceeds 8", () => {
      const current = DEMO_VEHICLES[0];
      expect(current).toBeDefined();
      if (!current) return;
      const alts = listDemoVehicleAlternatives(current.slug, 8);
      expect(alts.every((v) => v.slug !== current.slug)).toBe(true);
      expect(alts.length).toBe(Math.min(8, DEMO_VEHICLES.length - 1));
      for (const alt of alts) {
        expect(alt.coverImage?.url?.startsWith("/demo-vehicles/")).toBe(true);
      }
    });

    it("returns empty when exclude slug is missing", () => {
      expect(listDemoVehicleAlternatives("", 8)).toEqual([]);
    });
  });
});
