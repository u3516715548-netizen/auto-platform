import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  resolvePublicTenantFromHost,
  shouldDenyPublicStorefront,
  toPublicTenantView,
} from "@/lib/storefront/resolve-public-tenant";
import {
  listPublicVehicles,
  type PublicVehicleDto,
} from "@/lib/storefront/public-vehicles";
import { PublicStorefrontShell } from "@/components/storefront/public-shell";
import { PublicVehicleList } from "@/components/storefront/public-vehicle-list";
import { FeedbackBanner } from "@/components/ui/feedback-banner";

export async function generateMetadata(): Promise<Metadata> {
  const resolved = await resolvePublicTenantFromHost();
  if (resolved.kind === "ok") {
    return {
      title: `${resolved.tenant.name} — Stoc auto`,
      description: `Vehicule disponibile la ${resolved.tenant.name}.`,
    };
  }
  if (resolved.kind === "apex") {
    return {
      title: "Auto Platform",
      description: "Platformă multi-tenant pentru dealeri auto.",
    };
  }
  return { title: "Negăsit" };
}

/**
 * Apex → platform landing.
 * Tenant host → public catalog (active|trial).
 * Invalid/suspended → 404.
 */
export default async function RootPage() {
  const resolved = await resolvePublicTenantFromHost();

  if (shouldDenyPublicStorefront(resolved)) {
    notFound();
  }

  if (resolved.kind === "apex") {
    return <ApexLanding />;
  }

  if (resolved.kind !== "ok") {
    notFound();
  }

  const tenantView = toPublicTenantView(resolved.tenant);
  let vehicles: PublicVehicleDto[] = [];
  let listError: string | null = null;
  try {
    vehicles = await listPublicVehicles(resolved.tenant.tenantId);
  } catch {
    listError = "Stocul nu poate fi afișat momentan. Încearcă din nou mai târziu.";
  }

  return (
    <PublicStorefrontShell tenant={tenantView}>
      <div className="flex min-w-0 flex-col gap-5">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium tracking-wide uppercase" style={{ color: tenantView.primaryColor ?? "#0f766e" }}>
            Catalog
          </p>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">
            Vehicule disponibile
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-zinc-600">
            Stocul public al dealerului {tenantView.name}.
          </p>
        </div>

        {listError ? <FeedbackBanner variant="error">{listError}</FeedbackBanner> : null}

        {!listError && vehicles.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 bg-white px-4 py-10 text-center">
            <p className="text-base font-medium text-zinc-900">Niciun vehicul disponibil</p>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-zinc-600">
              Revenim curând cu oferte noi.
            </p>
          </div>
        ) : null}

        {!listError && vehicles.length > 0 ? (
          <PublicVehicleList vehicles={vehicles} accent={tenantView.primaryColor} />
        ) : null}
      </div>
    </PublicStorefrontShell>
  );
}

function ApexLanding() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-10 sm:max-w-2xl sm:px-6 sm:py-16">
      <p className="text-sm font-medium tracking-wide text-teal-800 uppercase">Auto Platform</p>
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
        Platformă pentru dealeri auto
      </h1>
      <p className="text-base leading-7 text-zinc-600">
        Storefront-ul public este pe hostul dealerului (ex.{" "}
        <span className="font-mono text-xs">acme.localhost:3000</span>
        ). Dashboard-ul staff rămâne pe{" "}
        <span className="font-mono text-xs">/login</span> și{" "}
        <span className="font-mono text-xs">/dashboard</span>.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/login"
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
        >
          Autentificare dealer
        </Link>
      </div>
    </main>
  );
}
