import Link from "next/link";
import { headers } from "next/headers";
import { getRootDomain } from "@/lib/supabase/env";
import { resolveTenantSlugFromHost } from "@/lib/tenant/resolve-tenant-from-host";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ auth?: string; error?: string }>;
}) {
  const params = await searchParams;
  const errorMessage =
    params.error === "membership"
      ? "Contul este autentificat, dar nu are membership pe acest dealer."
      : params.error === "tenant"
        ? "Tenant invalid sau indisponibil pe acest host."
        : null;
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "";

  let tenantSlug: string | null = null;
  try {
    const resolved = resolveTenantSlugFromHost(host, getRootDomain());
    if (resolved.kind === "tenant") {
      tenantSlug = resolved.slug;
    }
  } catch {
    tenantSlug = null;
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium tracking-wide text-teal-800 uppercase">Auto Platform</p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Autentificare dealer</h1>
        <p className="text-sm leading-6 text-zinc-600">
          Intră cu contul Supabase Auth. După login rămâi pe același host (acme / beta).
        </p>
      </div>

      {params.auth === "required" ? (
        <p className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
          Autentificare necesară pentru dashboard.
        </p>
      ) : null}

      {errorMessage ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <LoginForm tenantSlug={tenantSlug} />

      <p className="text-center text-sm text-zinc-500">
        <Link href="/" className="underline underline-offset-2 hover:text-zinc-800">
          Înapoi la pagina principală
        </Link>
      </p>
    </main>
  );
}
