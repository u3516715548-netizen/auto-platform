import { describe, expect, it } from "vitest";
import {
  PUBLIC_STOREFRONT_NO_HTML_CACHE_PATHS,
  PUBLIC_STOREFRONT_REVALIDATE_SECONDS,
  isPublicStorefrontRevalidatePath,
  middlewarePathRequiresAuthSession,
  publicStorefrontTenantTag,
} from "@/lib/perf/public-storefront-cache";

describe("public-storefront-cache", () => {
  it("uses a short positive TTL suitable for ISR", () => {
    expect(PUBLIC_STOREFRONT_REVALIDATE_SECONDS).toBe(30);
    expect(PUBLIC_STOREFRONT_REVALIDATE_SECONDS).toBeGreaterThan(0);
    expect(PUBLIC_STOREFRONT_REVALIDATE_SECONDS).toBeLessThanOrEqual(60);
  });

  it("keeps Compară and Salvate out of HTML cache allowlist", () => {
    expect(PUBLIC_STOREFRONT_NO_HTML_CACHE_PATHS).toContain("/compara");
    expect(PUBLIC_STOREFRONT_NO_HTML_CACHE_PATHS).toContain("/salvate");
  });

  it("scopes data-cache tags per tenant", () => {
    expect(publicStorefrontTenantTag("t-acme")).toBe("public-sf:t-acme");
    expect(publicStorefrontTenantTag("t-beta")).not.toBe(
      publicStorefrontTenantTag("t-acme"),
    );
  });

  it("requires auth session only on private / auth routes", () => {
    expect(middlewarePathRequiresAuthSession("/")).toBe(false);
    expect(middlewarePathRequiresAuthSession("/vehicles/koenigsegg-ccx")).toBe(false);
    expect(middlewarePathRequiresAuthSession("/compara")).toBe(false);
    expect(middlewarePathRequiresAuthSession("/salvate")).toBe(false);
    expect(middlewarePathRequiresAuthSession("/p/despre")).toBe(false);

    expect(middlewarePathRequiresAuthSession("/dashboard")).toBe(true);
    expect(middlewarePathRequiresAuthSession("/dashboard/vehicles")).toBe(true);
    expect(middlewarePathRequiresAuthSession("/login")).toBe(true);
    expect(middlewarePathRequiresAuthSession("/storefront-template-preview")).toBe(true);
    expect(middlewarePathRequiresAuthSession("/invite/abc")).toBe(true);
  });

  it("marks only safe public catalog/detail/CMS paths for short revalidate", () => {
    expect(isPublicStorefrontRevalidatePath("/")).toBe(true);
    expect(isPublicStorefrontRevalidatePath("/vehicles/koenigsegg-ccx")).toBe(true);
    expect(isPublicStorefrontRevalidatePath("/p/despre")).toBe(true);

    expect(isPublicStorefrontRevalidatePath("/compara")).toBe(false);
    expect(isPublicStorefrontRevalidatePath("/salvate")).toBe(false);
    expect(isPublicStorefrontRevalidatePath("/dashboard")).toBe(false);
    expect(isPublicStorefrontRevalidatePath("/login")).toBe(false);
  });
});
