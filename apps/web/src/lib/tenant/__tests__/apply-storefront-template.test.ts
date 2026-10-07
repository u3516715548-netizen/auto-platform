import { describe, expect, it } from "vitest";
import { isStorefrontTemplateReady } from "@/lib/storefront/templates/registry";
import { storefrontTemplateIdSchema } from "@auto-platform/types";

describe("apply storefront template guards", () => {
  it("allows only ready + zod-allowlisted template ids", () => {
    expect(isStorefrontTemplateReady("template-1")).toBe(true);
    expect(isStorefrontTemplateReady("template-2")).toBe(false);
    expect(storefrontTemplateIdSchema.safeParse("template-1").success).toBe(true);
    expect(storefrontTemplateIdSchema.safeParse("template-2").success).toBe(false);
  });
});
