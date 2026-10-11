import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  computeRatePopoverBox,
} from "@/components/storefront/vehicle-card-rate";
import { estimateMonthlyRateEur } from "@/lib/storefront/storefront-vehicle-lite";

const webRoot = resolve(__dirname, "../../..");

function readSrc(rel: string): string {
  return readFileSync(resolve(webRoot, rel), "utf8");
}

describe("VehicleCardRate mobile grid compact", () => {
  it("uses Info popover chrome with theme tokens and a11y for compact mobile", () => {
    const source = readSrc("components/storefront/vehicle-card-rate.tsx");
    expect(source).toContain('compactMobile');
    expect(source).toContain("data-catalog-rate-info");
    expect(source).toContain("data-catalog-rate-popover");
    expect(source).toContain("IconInfo");
    expect(source).toContain("createPortal");
    expect(source).toContain('role="dialog"');
    expect(source).toContain("aria-expanded");
    expect(source).toContain('event.key === "Escape"');
    expect(source).toContain("Vezi rata estimată pentru");
    expect(source).toContain("bg-[var(--sf-surface)]");
    expect(source).toContain("text-[var(--sf-text)]");
    expect(source).toContain("motion-reduce:transition-none");
    expect(source).toContain("stopPropagation");
    expect(source).toContain("hidden md:block");
    expect(source).toContain("md:hidden");
    expect(source).toContain("size-9");
    expect(source).not.toMatch(/backgroundColor:\s*["']#ffffff["']/);
  });

  it("returns null when monthly rate cannot be estimated", () => {
    expect(estimateMonthlyRateEur(null)).toBeNull();
    expect(estimateMonthlyRateEur("0")).toBeNull();
    const source = readSrc("components/storefront/vehicle-card-rate.tsx");
    expect(source).toContain("if (monthly == null) return null");
  });

  it("positions the popover inside the viewport for left and right columns", () => {
    const g = globalThis as typeof globalThis & {
      window?: { innerWidth: number; innerHeight: number };
    };
    const prev = g.window;
    g.window = { innerWidth: 390, innerHeight: 844 };
    try {
      const leftCol = {
        top: 400,
        bottom: 436,
        left: 40,
        right: 76,
        width: 36,
        height: 36,
        x: 40,
        y: 400,
        toJSON() {
          return this;
        },
      } as DOMRect;
      const leftBox = computeRatePopoverBox(leftCol);
      expect(leftBox.left).toBeGreaterThanOrEqual(8);
      expect(leftBox.left + leftBox.width).toBeLessThanOrEqual(390 - 8);

      const rightCol = {
        top: 400,
        bottom: 436,
        left: 310,
        right: 346,
        width: 36,
        height: 36,
        x: 310,
        y: 400,
        toJSON() {
          return this;
        },
      } as DOMRect;
      const rightBox = computeRatePopoverBox(rightCol);
      expect(rightBox.left).toBeGreaterThanOrEqual(8);
      expect(rightBox.left + rightBox.width).toBeLessThanOrEqual(390 - 8);
      expect(rightBox.top).toBeGreaterThanOrEqual(0);
    } finally {
      if (prev === undefined) delete g.window;
      else g.window = prev;
    }
  });
});

describe("mobile grid card Compare / Rate wiring", () => {
  it("hides Compară on mobile grid and keeps it in list layout", () => {
    const list = readSrc("components/storefront/public-vehicle-list.tsx");
    const actions = readSrc("components/storefront/vehicle-list-actions.tsx");

    expect(list).toContain('density="grid-mobile"');
    expect(list).toContain("compactMobile");
    expect(list).toContain("vehicleTitle={title}");
    expect(list).toContain('data-catalog-layout="list-row"');
    expect(list).toContain("<VehicleCardCompareButton vehicle={lite} />");
    expect(list).toContain("<VehicleCardRate price={vehicle.price} />");

    expect(actions).toContain("max-md:hidden");
    expect(actions).toContain('data-catalog-compare-wrap');
    expect(actions).toContain('density === "grid-mobile"');
    expect(actions).not.toContain("max-md:sr-only");
  });
});
