import Image from "next/image";
import Link from "next/link";
import { PricingGrid } from "@/components/marketing/pricing-grid";
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
    <SaasShell>
      <section className="saas-hero relative isolate overflow-hidden">
        <div aria-hidden className="saas-hero-glow pointer-events-none absolute inset-0" />
        <div aria-hidden className="saas-grid-fade pointer-events-none absolute inset-0 opacity-90" />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 right-[-10%] h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgba(184,255,46,0.16),transparent_68%)] blur-2xl"
        />

        <div className="relative mx-auto grid w-full max-w-6xl gap-12 px-4 pb-16 pt-12 sm:px-6 sm:pb-24 sm:pt-16 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-10">
          <div className="flex flex-col">
            <p className="saas-chip">
              <span className="saas-chip-dot" aria-hidden />
              Pentru dealeri auto
            </p>
            <h1
              className="mt-6 max-w-2xl text-4xl font-semibold tracking-tight text-white sm:text-5xl sm:leading-[1.05] lg:text-[3.35rem]"
              style={{ fontFamily: "var(--font-saas-display), ui-sans-serif, system-ui, sans-serif" }}
            >
              Showroom-ul tău auto,{" "}
              <span className="text-[var(--saas-neon)] [text-shadow:0_0_28px_rgba(184,255,46,0.35)]">
                sub propriul brand
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-[var(--saas-muted)] sm:text-lg">
              Îți creezi rapid un showroom online pentru stocul tău, cu pagini clare pentru mașini,
              cereri de la clienți și administrare simplă într-un singur loc.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/preturi" className="saas-btn-neon-glow">
                Vezi planurile
              </Link>
              <Link href="/login" className="saas-btn-ghost">
                Intră în cont
              </Link>
            </div>
            <ul className="mt-10 grid max-w-xl list-none gap-3 p-0 sm:grid-cols-3">
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
          </div>

          <aside className="relative mx-auto w-full max-w-md lg:mx-0 lg:justify-self-end">
            <div className="saas-card-featured relative overflow-hidden rounded-[1.35rem] border p-1.5">
              <div className="relative overflow-hidden rounded-[1.1rem] bg-[#0a0a0a]">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_20%,rgba(184,255,46,0.18),transparent_55%)]" />
                <div className="relative flex flex-col gap-5 p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <span className="saas-chip !normal-case !tracking-normal">
                      <Image
                        src="/brand/autobear-icon.png"
                        alt=""
                        width={16}
                        height={16}
                        className="h-4 w-4 invert"
                      />
                      Gata de publicat
                    </span>
                    <span className="text-[0.7rem] font-semibold tracking-[0.12em] text-white/40 uppercase">
                      Online
                    </span>
                  </div>
                  <div
                    className="text-2xl font-semibold tracking-tight text-white sm:text-3xl"
                    style={{ fontFamily: "var(--font-saas-display), ui-sans-serif, system-ui, sans-serif" }}
                  >
                    Showroom-ul tău, online
                  </div>
                  <p className="text-sm leading-6 text-white/60">
                    Sub brandul tău: stoc clar, cereri organizate, administrare simplă.
                  </p>
                  <div className="h-px w-full bg-gradient-to-r from-[var(--saas-neon)]/50 via-white/10 to-transparent" />
                  <ul className="space-y-2.5 text-sm text-white/75">
                    {["Propriul brand", "Administrare simplă", "Cereri într-un singur loc"].map(
                      (line) => (
                        <li key={line} className="flex items-center gap-2.5">
                          <span
                            aria-hidden
                            className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--saas-neon)] shadow-[0_0_8px_rgba(184,255,46,0.8)]"
                          />
                          {line}
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </aside>
        </div>
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

      <section className="border-t border-white/8 bg-[var(--saas-ink)] px-4 py-14 sm:px-6 sm:py-20">
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
