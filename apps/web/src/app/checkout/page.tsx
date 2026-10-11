import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { loginPath } from "@/lib/auth/auth-redirects";
import { parseSelfServePlanCode } from "@/lib/billing/plan-codes";
import { isCommercialSelfServeCheckoutEnabled } from "@/lib/marketing/commercial-plans";
import { getRootDomain } from "@/lib/supabase/env";
import { resolveTenantSlugFromHost } from "@/lib/tenant/resolve-tenant-from-host";
import { CheckoutForm } from "./checkout-form";
import { SaasShell } from "@/components/marketing/saas-shell";

/** Runtime env gate (`COMMERCIAL_SELF_SERVE_CHECKOUT`) — never bake 404 at build. */
export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; canceled?: string }>;
}) {
  // Pre-launch: public checkout surface off until COMMERCIAL_SELF_SERVE_CHECKOUT=1.
  if (!isCommercialSelfServeCheckoutEnabled()) {
    notFound();
  }

  const params = await searchParams;
  const plan = parseSelfServePlanCode(params.plan);
  if (!plan) {
    notFound();
  }

  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "";
  const resolved = resolveTenantSlugFromHost(host, getRootDomain());
  if (resolved.kind !== "apex") {
    notFound();
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect(loginPath({ plan, next: `/checkout?plan=${plan}` }));
  }

  return (
    <SaasShell>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium tracking-wide text-teal-800 uppercase">Checkout</p>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Activează storefront-ul
          </h1>
          <p className="text-sm leading-6 text-zinc-600">
            Autentificat ca{" "}
            <span className="font-medium text-zinc-800">
              {user.email ?? user.profile?.email ?? "cont"}
            </span>
            . Alege numele și subdomeniul, apoi plătești lunar în RON.
          </p>
        </div>

        <CheckoutForm plan={plan} canceled={params.canceled === "1"} />

        <p className="text-center text-sm text-zinc-500">
          <Link href="/preturi" className="underline underline-offset-2 hover:text-zinc-800">
            Înapoi la prețuri
          </Link>
        </p>
      </main>
    </SaasShell>
  );
}
