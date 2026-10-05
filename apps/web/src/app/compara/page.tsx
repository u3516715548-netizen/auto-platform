import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  resolvePublicTenantFromHost,
  shouldDenyPublicStorefront,
  toPublicTenantViewForRequest,
} from "@/lib/storefront/resolve-public-tenant";
import { publicCatalogPath } from "@/lib/storefront/paths";
import { PublicStorefrontShell } from "@/components/storefront/public-shell";
import { ComparePageClient } from "@/components/storefront/compare-page-client";
import { IconChevronLeft } from "@/components/storefront/icons";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const resolved = await resolvePublicTenantFromHost();
  if (resolved.kind === "ok") {
    return { title: `Comparație — ${resolved.tenant.name}` };
  }
  return { title: "Comparație" };
}

export default async function ComparePage() {
  const resolved = await resolvePublicTenantFromHost();
  if (shouldDenyPublicStorefront(resolved) || resolved.kind !== "ok") {
    notFound();
  }

  const tenantView = await toPublicTenantViewForRequest(resolved.tenant);

  return (
    <PublicStorefrontShell tenant={tenantView} stickySurface="catalog">
      <div className="flex min-w-0 flex-col gap-5">
        <div className="flex items-center gap-3">
          <Link
            href={publicCatalogPath()}
            className="inline-flex min-h-10 items-center gap-1 rounded-full border border-[var(--sf-border)] bg-white px-3 text-sm font-semibold text-[var(--sf-text)]"
          >
            <IconChevronLeft size={16} />
            Înapoi
          </Link>
          <h1 className="text-xl font-bold text-[var(--sf-text)]">Comparație</h1>
        </div>
        <ComparePageClient />
      </div>
    </PublicStorefrontShell>
  );
}
