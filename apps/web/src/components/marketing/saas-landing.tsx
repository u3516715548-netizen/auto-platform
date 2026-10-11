import Link from "next/link";
import { PricingGrid } from "@/components/marketing/pricing-grid";
import { SaasShell } from "@/components/marketing/saas-shell";

/**
 * Commercial SaaS landing for apex Host only (Etapa 26A).
 * Brand-first hero; pricing below the fold; no dealer catalog.
 */
export function SaasLanding() {
  return (
    <SaasShell>
      <section className="saas-hero relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(45,212,191,0.28),transparent_55%),radial-gradient(ellipse_at_90%_30%,rgba(15,118,110,0.35),transparent_50%),linear-gradient(165deg,#042f2e_0%,#0a1628_48%,#020617_100%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:48px_48px]"
        />
        <div className="relative mx-auto flex w-full max-w-5xl flex-col px-4 pb-16 pt-14 sm:px-6 sm:pb-24 sm:pt-20">
          <p className="text-sm font-semibold tracking-[0.18em] text-teal-300 uppercase">
            Auto Platform
          </p>
          <h1
            className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl sm:leading-[1.1]"
            style={{ fontFamily: "var(--font-saas-display), Georgia, serif" }}
          >
            Storefrontul tău auto, pe subdomeniu propriu
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-teal-50/80">
            Publică stocul, primește lead-uri și gestionează inventarul — fără să amesteci site-ul
            platformei cu showroom-ul dealerului.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/preturi"
              className="inline-flex min-h-12 items-center justify-center rounded-md bg-teal-400 px-5 py-3 text-sm font-semibold text-teal-950 transition hover:bg-teal-300"
            >
              Vezi planurile
            </Link>
            <Link
              href="/login"
              className="inline-flex min-h-12 items-center justify-center rounded-md border border-white/20 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Am deja cont
            </Link>
          </div>
        </div>
      </section>

      <div className="bg-[var(--saas-ink)]">
        <PricingGrid />
      </div>
    </SaasShell>
  );
}
