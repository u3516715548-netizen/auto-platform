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
import { SavedPageClient } from "@/components/storefront/saved-page-client";
import { IconChevronLeft } from "@/components/storefront/icons";
import { withPerfRoute } from "@/lib/perf/server-timing";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const resolved = await resolvePublicTenantFromHost();
  if (resolved.kind === "ok") {
    return { title: `Salvate — ${resolved.tenant.name}` };
  }
  return { title: "Salvate" };
}

export default async function SavedPage() {
  return withPerfRoute("salvate", async () => {
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
            prefetch={false}
            className="inline-flex min-h-10 items-center gap-1 rounded-full border border-[var(--sf-border)] bg-white px-3 text-sm font-semibold text-[var(--sf-text)]"
          >
            <IconChevronLeft size={16} />
            Înapoi
          </Link>
          <div>
            <h1 className="text-xl font-bold text-[var(--sf-text)]">Salvate</h1>
            <p className="text-sm text-[var(--sf-text-muted)]">
              Doar pe acest dispozitiv (localStorage)
            </p>
          </div>
        </div>
        <SavedPageClient />
      </div>
    </PublicStorefrontShell>
  );
  });
}
