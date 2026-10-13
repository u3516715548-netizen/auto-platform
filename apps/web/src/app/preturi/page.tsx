import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PricingGrid } from "@/components/marketing/pricing-grid";
import { SaasShell } from "@/components/marketing/saas-shell";
import { resolvePublicTenantFromHost } from "@/lib/storefront/resolve-public-tenant";

export const metadata: Metadata = {
  title: "Prețuri AUTOBEAR — planuri pentru dealeri auto",
  description:
    "Planuri lunare în RON: 149, 299, 599 lei. Site de stoc, inventar și cereri de la clienți. Activare prin contact.",
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
      <PricingGrid pageMode />
    </SaasShell>
  );
}
