import Link from "next/link";
import { headers } from "next/headers";
import { getRootDomain } from "@/lib/supabase/env";
import { resolveTenantSlugFromHost } from "@/lib/tenant/resolve-tenant-from-host";
import { parseSelfServePlanCode } from "@/lib/billing/plan-codes";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    auth?: string;
    error?: string;
    next?: string;
    plan?: string;
  }>;
}) {
  const params = await searchParams;
  const plan = parseSelfServePlanCode(params.plan);
  const errorMessage =
    params.error === "membership"
      ? "Contul e autentificat, dar nu are acces la acest showroom."
      : params.error === "tenant"
        ? "Showroom-ul nu este disponibil pe această adresă."
        : null;
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "";

  let tenantSlug: string | null = null;
  let isApex = false;
  try {
    const resolved = resolveTenantSlugFromHost(host, getRootDomain());
    if (resolved.kind === "tenant") {
      tenantSlug = resolved.slug;
    } else if (resolved.kind === "apex") {
      isApex = true;
    }
  } catch {
    tenantSlug = null;
  }

  const commercialFlow = Boolean(plan && isApex);
  const nextForCheckout =
    params.next ?? (commercialFlow && plan ? `/checkout?plan=${plan}` : null);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium tracking-wide text-teal-800 uppercase">AUTOBEAR</p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          {commercialFlow ? "Creează contul pentru activare" : "Intră în cont"}
        </h1>
        <p className="text-sm leading-6 text-zinc-600">
          {commercialFlow
            ? "Creează un cont sau autentifică-te. Apoi alegi adresa site-ului și finalizezi plata."
            : "Folosește emailul și parola contului tău AUTOBEAR."}
        </p>
      </div>

      {params.auth === "required" ? (
        <p className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
          Autentifică-te ca să deschizi panoul.
        </p>
      ) : null}

      {errorMessage ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <LoginForm
        tenantSlug={tenantSlug}
        nextPath={nextForCheckout}
        plan={plan}
        allowSignup={commercialFlow}
      />

      <p className="text-center text-sm text-zinc-500">
        <Link href="/" className="underline underline-offset-2 hover:text-zinc-800">
          Înapoi la pagina principală
        </Link>
      </p>
    </main>
  );
}
