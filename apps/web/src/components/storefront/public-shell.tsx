import type { ReactNode } from "react";
import type { PublicTenantView } from "@/lib/storefront/resolve-public-tenant";

type PublicStorefrontShellProps = {
  tenant: PublicTenantView;
  children: ReactNode;
};

/**
 * Minimal public chrome for dealer storefront (Etapa 5).
 * Does not include dashboard navigation.
 */
export function PublicStorefrontShell({ tenant, children }: PublicStorefrontShellProps) {
  const accent = tenant.primaryColor ?? "#0f766e";

  return (
    <div
      className="flex min-h-full min-w-0 flex-1 flex-col overflow-x-hidden bg-zinc-50 text-zinc-900"
      style={{ ["--storefront-accent" as string]: accent }}
    >
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-3 py-4 sm:px-6">
          <div className="min-w-0">
            <p
              className="text-xs font-medium tracking-wide uppercase"
              style={{ color: accent }}
            >
              {tenant.slug}
            </p>
            <h1 className="truncate text-lg font-semibold tracking-tight text-zinc-900 sm:text-xl">
              {tenant.name}
            </h1>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full min-w-0 max-w-5xl flex-1 px-3 py-5 sm:px-6 sm:py-8">
        {children}
      </main>
      <footer className="border-t border-zinc-200 bg-white">
        <div className="mx-auto max-w-5xl px-3 py-4 text-xs text-zinc-500 sm:px-6">
          {tenant.name} · stoc public
        </div>
      </footer>
    </div>
  );
}
