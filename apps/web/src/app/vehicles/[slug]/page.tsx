import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  resolvePublicTenantFromHost,
  shouldDenyPublicStorefront,
  toPublicTenantView,
} from "@/lib/storefront/resolve-public-tenant";
import { getPublicVehicleBySlug } from "@/lib/storefront/public-vehicles";
import { parseVehicleSlugParam } from "@/lib/storefront/parse-public-lead";
import { publicCatalogPath } from "@/lib/storefront/paths";
import { PublicStorefrontShell } from "@/components/storefront/public-shell";
import { PublicLeadForm } from "@/components/storefront/public-lead-form";

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
    title: `${vehicle.make} ${vehicle.model} (${vehicle.year}) — ${resolved.tenant.name}`,
    description: `${vehicle.make} ${vehicle.model}, ${vehicle.year}, ${vehicle.mileage} km la ${resolved.tenant.name}.`,
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

  const vehicle = await getPublicVehicleBySlug(resolved.tenant.tenantId, slug);
  if (!vehicle) {
    notFound();
  }

  const tenantView = toPublicTenantView(resolved.tenant);
  const accent = tenantView.primaryColor ?? "#0f766e";
  const priceLabel = formatPrice(vehicle.price, vehicle.currency);
  const specEntries = Object.entries(vehicle.specs);

  return (
    <PublicStorefrontShell tenant={tenantView}>
      <div className="mx-auto flex w-full min-w-0 max-w-2xl flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Link
            href={publicCatalogPath()}
            className="text-sm font-medium underline-offset-2 hover:underline"
            style={{ color: accent }}
          >
            ← Înapoi la catalog
          </Link>
          <h2 className="break-words text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">
            {vehicle.make} {vehicle.model}
          </h2>
          <p className="text-sm text-zinc-600">
            {vehicle.year} · {new Intl.NumberFormat("ro-RO").format(vehicle.mileage)} km
          </p>
          <p className="text-2xl font-semibold text-zinc-900">{priceLabel}</p>
        </div>

        {specEntries.length > 0 ? (
          <dl className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-4 sm:grid-cols-2">
            {specEntries.map(([key, value]) => (
              <div key={key}>
                <dt className="text-xs font-medium tracking-wide text-zinc-500 uppercase">{key}</dt>
                <dd className="mt-1 text-sm text-zinc-900">{String(value)}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        <section className="rounded-lg border border-zinc-200 bg-white p-4 sm:p-5">
          <h3 className="mb-1 text-base font-semibold text-zinc-900">Sunt interesat</h3>
          <p className="mb-4 text-sm leading-6 text-zinc-600">
            Lasă datele de contact și te vom contacta în legătură cu acest vehicul.
          </p>
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

function formatPrice(price: string, currency: string): string {
  const amount = Number(price);
  if (Number.isFinite(amount)) {
    return new Intl.NumberFormat("ro-RO", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  }
  return `${price} ${currency}`;
}
