import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PricingGrid } from "@/components/marketing/pricing-grid";
import { SaasShell } from "@/components/marketing/saas-shell";
import { resolvePublicTenantFromHost } from "@/lib/storefront/resolve-public-tenant";

export const metadata: Metadata = {
  title: "Prețuri — Autobear",
  description:
    "Planuri lunare în RON pentru dealeri auto: 50, Business, Premium și Enterprise.",
};

/**
 * Commercial pricing — apex Host only.
 * Tenant hosts keep the dealer storefront; they must not see SaaS pricing here.
 */
export default async function PreturiPage() {
  const resolved = await resolvePublicTenantFromHost();
  if (resolved.kind !== "apex") {
    notFound();
  }

  return (
    <SaasShell>
      <div className="saas-hero relative overflow-hidden bg-[var(--saas-ink)]">
        <div aria-hidden className="saas-hero-glow pointer-events-none absolute inset-0" />
        <div aria-hidden className="saas-grid-fade pointer-events-none absolute inset-0 opacity-70" />
        <div className="relative">
          <PricingGrid pageMode />
        </div>
      </div>
    </SaasShell>
  );
}
