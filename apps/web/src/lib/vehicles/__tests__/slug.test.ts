import { describe, expect, it } from "vitest";
import { buildVehicleSlug, withSlugSuffix } from "@auto-platform/core";

describe("vehicle slug helpers", () => {
  it("builds a relative-safe slug from make/model/year", () => {
    expect(buildVehicleSlug("Volkswagen", "Golf GTI", 2022)).toBe("volkswagen-golf-gti-2022");
  });

  it("adds numeric suffix without leaving the slug empty", () => {
    expect(withSlugSuffix("golf", 0)).toBe("golf");
    expect(withSlugSuffix("golf", 1)).toBe("golf-2");
  });
});
