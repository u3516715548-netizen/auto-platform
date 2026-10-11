import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { eq, and } from "drizzle-orm";
import {
  billingCheckoutSessions,
  getDb,
  tenants,
} from "@auto-platform/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getRootDomain } from "@/lib/supabase/env";
import { resolveTenantSlugFromHost } from "@/lib/tenant/resolve-tenant-from-host";
import { SaasShell } from "@/components/marketing/saas-shell";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; outcome?: string }>;
}) {
  const params = await searchParams;
  const sessionId = params.session_id?.trim();
  if (!sessionId) {
    notFound();
  }

  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "";
  const resolved = resolveTenantSlugFromHost(host, getRootDomain());
  if (resolved.kind !== "apex") {
    notFound();
  }

  const user = await getCurrentUser();
  if (!user?.profile) {
    notFound();
  }

  const db = getDb();
  const [checkout] = await db
    .select({
      status: billingCheckoutSessions.status,
      tenantId: billingCheckoutSessions.tenantId,
      planCode: billingCheckoutSessions.planCode,
    })
    .from(billingCheckoutSessions)
    .where(
      and(
        eq(billingCheckoutSessions.externalSessionId, sessionId),
        eq(billingCheckoutSessions.profileId, user.profile.id),
      ),
    )
    .limit(1);

  if (!checkout) {
    notFound();
  }

  const [tenant] = await db
    .select({ slug: tenants.slug, name: tenants.name, status: tenants.status })
    .from(tenants)
    .where(eq(tenants.id, checkout.tenantId))
    .limit(1);

  if (!tenant) {
    notFound();
  }

  const root = getRootDomain();
  const dealerHost = `${tenant.slug}.${root}`;
  const active = checkout.status === "completed" && tenant.status === "active";

  return (
    <SaasShell>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium tracking-wide text-teal-800 uppercase">
            {active ? "Activ" : "În procesare"}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            {active ? "Dealer activat" : "Confirmăm plata"}
          </h1>
          <p className="text-sm leading-6 text-zinc-600">
            {active
              ? `${tenant.name} este activ. Continuă pe hostul dealerului pentru dashboard.`
              : "Webhook-ul confirmă plata în câteva secunde. Reîncarcă pagina dacă dashboard-ul nu e încă disponibil."}
          </p>
        </div>

        <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-700">
          <p>
            Storefront: <span className="font-mono text-xs">{dealerHost}</span>
          </p>
          <p className="mt-1">
            Plan: <span className="font-medium">{checkout.planCode}</span>
          </p>
        </div>

        {active ? (
          <a
            href={`http://${dealerHost}/dashboard`}
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
          >
            Deschide dashboard
          </a>
        ) : (
          <Link
            href={`/checkout/success?session_id=${encodeURIComponent(sessionId)}`}
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
          >
            Reîncarcă status
          </Link>
        )}

        <p className="text-center text-sm text-zinc-500">
          <Link href="/" className="underline underline-offset-2 hover:text-zinc-800">
            Înapoi la landing
          </Link>
        </p>
      </main>
    </SaasShell>
  );
}
