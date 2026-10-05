import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  resolvePublicTenantFromHost,
  shouldDenyPublicStorefront,
  toPublicTenantViewForRequest,
} from "@/lib/storefront/resolve-public-tenant";
import {
  getPublicVehicleBySlug,
  getPublicVehicleDetailBySlug,
} from "@/lib/storefront/public-vehicles";
import {
  buildPublicVehicleDetailDescription,
  buildPublicVehicleDetailTitle,
} from "@/lib/storefront/public-dto";
import { parseVehicleSlugParam } from "@/lib/storefront/parse-public-lead";
import { publicCatalogPath } from "@/lib/storefront/paths";
import { STOREFRONT_CONTACT_ANCHOR_ID } from "@/lib/storefront/storefront-contact-links";
import { PublicStorefrontShell } from "@/components/storefront/public-shell";
import { PublicLeadForm } from "@/components/storefront/public-lead-form";
import { PublicVehicleDetail } from "@/components/storefront/public-vehicle-detail";
import { VehicleSaveHeaderButton } from "@/components/storefront/vehicle-list-actions";
import { IconChevronLeft } from "@/components/storefront/icons";
import { toStorefrontVehicleLite } from "@/lib/storefront/storefront-vehicle-lite";

/** Always read fresh inventory — reserved/sold → 404, never stale public detail. */
export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug: raw } = await params;
  const slug = parseVehicleSlugParam(raw);
  const resolved = await resolvePublicTenantFromHost();
  if (resolved.kind !== "ok" || !slug) {
    return { title: "Vehicul" };
  }
  const vehicle = await getPublicVehicleBySlug(resolved.tenant.tenantId, slug);
  if (!vehicle) {
    return { title: "Vehicul indisponibil" };
  }
  return {
    title: buildPublicVehicleDetailTitle(vehicle, resolved.tenant.name),
    description: buildPublicVehicleDetailDescription(vehicle),
  };
}

export default async function PublicVehicleDetailPage({ params }: PageProps) {
  const { slug: raw } = await params;
  const slug = parseVehicleSlugParam(raw);
  if (!slug) {
    notFound();
  }

  const resolved = await resolvePublicTenantFromHost();
  if (shouldDenyPublicStorefront(resolved) || resolved.kind !== "ok") {
    notFound();
  }

  const vehicle = await getPublicVehicleDetailBySlug(resolved.tenant.tenantId, slug);
  if (!vehicle) {
    notFound();
  }

  const tenantView = await toPublicTenantViewForRequest(resolved.tenant);
  const accent = tenantView.primaryColor;
  const cover = vehicle.images.find((img) => img.url) ?? vehicle.images[0] ?? null;
  const lite = toStorefrontVehicleLite({
    ...vehicle,
    coverImage: cover ? { url: cover.url, altText: cover.altText } : null,
  });

  return (
    <PublicStorefrontShell
      tenant={tenantView}
      stickySurface="detail"
      mainClassName="pb-28 md:pb-8"
    >
      <div className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-6 sm:gap-8">
        <div className="flex items-center justify-between gap-3">
          <Link
            href={publicCatalogPath()}
            className="inline-flex min-h-10 items-center gap-1 rounded-full border border-[var(--sf-border)] bg-white px-3 text-sm font-semibold text-[var(--sf-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-accent)]"
          >
            <IconChevronLeft size={16} />
            Înapoi
          </Link>
          <p className="min-w-0 truncate text-center text-sm font-bold text-[var(--sf-text)]">
            {vehicle.make} {vehicle.model}
          </p>
          <VehicleSaveHeaderButton vehicle={lite} />
        </div>

        <PublicVehicleDetail
          vehicle={vehicle}
          images={vehicle.images}
          accent={accent}
          leadsEnabled={tenantView.leadsEnabled}
        />

        <section
          id={STOREFRONT_CONTACT_ANCHOR_ID}
          aria-labelledby="lead-form-heading"
          className="scroll-mt-28 rounded-[var(--sf-radius-lg)] border border-[var(--sf-border)] bg-white p-4 sm:p-5"
        >
          <PublicLeadForm
            vehicleSlug={vehicle.slug}
            accent={accent}
            disabled={!tenantView.leadsEnabled}
            disabledMessage="Contactul online nu este disponibil momentan pentru acest dealer."
          />
        </section>
      </div>
    </PublicStorefrontShell>
  );
}
