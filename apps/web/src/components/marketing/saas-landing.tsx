import Link from "next/link";
import { PricingGrid } from "@/components/marketing/pricing-grid";
import { SaasBearWalk } from "@/components/marketing/saas-bear-walk";
import { SaasHeroHeadline } from "@/components/marketing/saas-hero-headline";
import { SaasHeroVideo } from "@/components/marketing/saas-hero-video";
import { SaasInterestForm } from "@/components/marketing/saas-interest-form";
import { SaasShell } from "@/components/marketing/saas-shell";

const HERO_BENEFITS = [
  {
    title: "Sub brandul tău",
    body: "Showroom pe adresa ta, nu pe site-ul platformei.",
  },
  {
    title: "Administrare simplă",
    body: "Stocul și statusul mașinilor, într-un singur panou.",
  },
  {
    title: "Cereri într-un singur loc",
    body: "Mesajele de pe site ajung clar la echipa ta.",
  },
] as const;

const FEATURES = [
  {
    title: "Brandul tău, vizibil online",
    body: "Clienții văd showroom-ul pe adresa ta — cu stocul prezentat clar.",
    accent: "neon" as const,
  },
  {
    title: "Stoc și cereri, împreună",
    body: "Publici mașinile, actualizezi statusul și vezi cererile în același panou.",
    accent: "cyan" as const,
  },
  {
    title: "Plan după volumul tău",
    body: "Alegi câte mașini publici — de la showroom mic la stoc mare.",
    accent: "neon" as const,
  },
] as const;

const HOW_IT_WORKS = [
  {
    step: "1",
    title: "Alegi planul potrivit",
    body: "După câte mașini vrei să publici.",
  },
  {
    step: "2",
    title: "Îți activăm showroom-ul",
    body: "Pe adresa ta, prin contact.",
  },
  {
    step: "3",
    title: "Publici mașinile și primești cereri",
    body: "Stocul e online; cererile vin într-un singur loc.",
  },
] as const;

/**
 * Commercial SaaS landing for apex Host only (Etapa 26A+ Autobear neon).
 * Brand-first hero; pricing below the fold; no dealer catalog.
 */
export function SaasLanding() {
  return (
    <SaasShell transparentHeader>
      <section className="saas-hero">
        {/* Background layer — video + overlays; does not affect content spacing */}
        <div className="saas-hero-bg" aria-hidden>
          <SaasHeroVideo />
          <div className="saas-hero-video-scrim" />
          <div className="saas-hero-video-tint" />
          <div className="saas-grid-fade absolute inset-0 opacity-40" />
        </div>

        <div className="saas-hero-frame">
          {/* Single content group: headline → sub → form → CTAs (Shopify hierarchy) */}
          <div className="saas-hero-content">
            <SaasHeroHeadline />
            <p className="saas-hero-sub">
              Un showroom sub brandul tău. Mașini, stoc și cereri într-un singur loc.
            </p>
            <SaasInterestForm className="saas-hero-interest" />
            <div className="saas-hero-secondary-row">
              <Link href="/preturi" className="saas-hero-secondary">
                Vezi planurile
              </Link>
              <SaasBearWalk className="saas-bear-walk-inline" />
            </div>
          </div>
        </div>
      </section>

      <section
        className="border-t border-white/8 bg-[var(--saas-ink)] px-4 py-12 sm:px-6 sm:py-16"
        aria-label="Beneficii rapide"
      >
        <ul className="mx-auto grid w-full max-w-6xl list-none gap-3 p-0 sm:grid-cols-3">
          {HERO_BENEFITS.map((item) => (
            <li
              key={item.title}
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-3.5 py-3.5 backdrop-blur-sm"
            >
              <p
                className="text-sm font-semibold text-white"
                style={{ fontFamily: "var(--font-saas-display), ui-sans-serif, system-ui, sans-serif" }}
              >
                {item.title}
              </p>
              <p className="mt-1.5 text-xs leading-5 text-white/50">{item.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-t border-white/8 bg-[var(--saas-surface)] px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto w-full max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-[0.7rem] font-bold tracking-[0.16em] text-[var(--saas-neon)] uppercase">
              Cum începi
            </p>
            <h2
              className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl"
              style={{ fontFamily: "var(--font-saas-display), ui-sans-serif, system-ui, sans-serif" }}
            >
              Fă-ți propriul showroom online, în câțiva pași simpli
            </h2>
          </div>
          <ol className="mt-10 grid list-none gap-4 p-0 md:grid-cols-3">
            {HOW_IT_WORKS.map((item) => (
              <li key={item.step} className="saas-card p-5 sm:p-6">
                <p
                  className="text-sm font-semibold text-[var(--saas-neon)]"
                  style={{ fontFamily: "var(--font-saas-display), ui-sans-serif, system-ui, sans-serif" }}
                >
                  {item.step}
                </p>
                <h3
                  className="mt-3 text-lg font-semibold text-white"
                  style={{ fontFamily: "var(--font-saas-display), ui-sans-serif, system-ui, sans-serif" }}
                >
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-white/60">{item.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section
        id="de-ce"
        className="border-t border-white/8 bg-[var(--saas-ink)] scroll-mt-24 px-4 py-14 sm:px-6 sm:py-20"
      >
        <div className="mx-auto w-full max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-[0.7rem] font-bold tracking-[0.16em] text-[var(--saas-neon)] uppercase">
              De ce AUTOBEAR
            </p>
            <h2
              className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl"
              style={{ fontFamily: "var(--font-saas-display), ui-sans-serif, system-ui, sans-serif" }}
            >
              Clar pentru clienți. Simplu pentru echipă.
            </h2>
          </div>
          <ul className="mt-10 grid list-none gap-4 p-0 md:grid-cols-3">
            {FEATURES.map((feature) => (
              <li key={feature.title} className="saas-card p-5 sm:p-6">
                <div
                  className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl border ${
                    feature.accent === "cyan"
                      ? "border-cyan-300/35 bg-cyan-400/10 text-cyan-200"
                      : "border-[var(--saas-border-neon)] bg-[var(--saas-neon-dim)] text-[var(--saas-neon)]"
                  }`}
                  aria-hidden
                >
                  <span className="text-lg leading-none">◆</span>
                </div>
                <h3
                  className="text-lg font-semibold text-white"
                  style={{ fontFamily: "var(--font-saas-display), ui-sans-serif, system-ui, sans-serif" }}
                >
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-white/60">{feature.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <PricingGrid />

      <section className="border-t border-white/8 bg-[var(--saas-surface)] px-4 py-14 sm:px-6 sm:py-16">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <h2
              className="text-2xl font-semibold tracking-tight text-white sm:text-3xl"
              style={{ fontFamily: "var(--font-saas-display), ui-sans-serif, system-ui, sans-serif" }}
            >
              Gata să îți pui stocul online?
            </h2>
            <p className="mt-3 text-base leading-7 text-white/60">
              Alege planul și scrie-ne. Îți activăm showroom-ul sub brandul tău.
            </p>
          </div>
          <Link href="/preturi" className="saas-btn-neon-glow shrink-0">
            Vezi planurile
          </Link>
        </div>
      </section>
    </SaasShell>
  );
}
