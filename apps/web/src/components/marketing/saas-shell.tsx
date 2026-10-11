import Link from "next/link";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import type { ReactNode } from "react";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-saas-display",
});

const body = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-saas-body",
});

type SaasShellProps = {
  children: ReactNode;
};

/**
 * Apex-only commercial chrome (Etapa 26A). Not used on tenant storefront hosts.
 */
export function SaasShell({ children }: SaasShellProps) {
  return (
    <div
      className={`${display.variable} ${body.variable} saas-marketing flex min-h-full flex-1 flex-col text-[var(--saas-ink)]`}
      style={{ fontFamily: "var(--font-saas-body), ui-sans-serif, system-ui, sans-serif" }}
    >
      <header className="relative z-10 border-b border-white/10 bg-[color-mix(in_srgb,var(--saas-ink)_88%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link
            href="/"
            className="text-lg font-semibold tracking-tight text-white"
            style={{ fontFamily: "var(--font-saas-display), Georgia, serif" }}
          >
            Auto Platform
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3" aria-label="Navigare platformă">
            <Link
              href="/preturi"
              className="rounded-md px-3 py-2 text-sm font-medium text-teal-50/90 transition hover:bg-white/10 hover:text-white"
            >
              Prețuri
            </Link>
            <Link
              href="/login"
              className="inline-flex min-h-10 items-center justify-center rounded-md bg-teal-400 px-3.5 py-2 text-sm font-semibold text-teal-950 transition hover:bg-teal-300"
            >
              Autentificare
            </Link>
          </nav>
        </div>
      </header>
      <div className="relative flex flex-1 flex-col">{children}</div>
      <footer className="border-t border-white/10 bg-[var(--saas-ink)] px-4 py-8 text-sm text-teal-100/70 sm:px-6">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p style={{ fontFamily: "var(--font-saas-display), Georgia, serif" }}>Auto Platform</p>
          <p>Storefrontul dealerului rămâne pe subdomeniu — nu pe această pagină.</p>
        </div>
      </footer>
    </div>
  );
}
