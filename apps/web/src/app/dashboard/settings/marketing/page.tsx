import Link from "next/link";
import { requireSettingsOwner } from "@/lib/auth/require-settings-owner";
import { getMarketingIntegrationsForSettings } from "@/lib/marketing/get-marketing-integrations";
import {
  buildMarketingOverviewStatus,
  marketingStatusLabelRo,
} from "@/lib/marketing/marketing-status";
import { FeedbackBanner } from "@/components/ui/feedback-banner";

function statusClass(status: string): string {
  if (status === "configured") return "bg-emerald-50 text-emerald-800 ring-emerald-200";
  if (status === "disabled") return "bg-amber-50 text-amber-900 ring-amber-200";
  return "bg-zinc-100 text-zinc-700 ring-zinc-200";
}

/**
 * Marketing Overview — owner only. Configuration only; no live storefront scripts.
 */
export default async function DashboardMarketingOverviewPage() {
  const session = await requireSettingsOwner();
  const settings = await getMarketingIntegrationsForSettings(session);
  const cards = buildMarketingOverviewStatus(settings);

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <p className="text-sm font-medium tracking-wide text-teal-800 uppercase">Marketing</p>
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">Overview</h2>
        <p className="max-w-2xl text-sm leading-6 text-zinc-600">
          Configurează ID-urile de analytics, ads și verification pentru{" "}
          <span className="font-medium text-zinc-800">{session.tenant.name}</span>. Valorile sunt
          izolate pe tenant și vizibile doar owner-ului.
        </p>
      </section>

      <FeedbackBanner variant="info">
        Runtime storefront: tag-urile GTM/GA/pixeli se încarcă doar cu consent. Evenimentele
        standard (<code className="rounded bg-zinc-100 px-1">page_view</code>,{" "}
        <code className="rounded bg-zinc-100 px-1">view_item</code>,{" "}
        <code className="rounded bg-zinc-100 px-1">generate_lead</code>, etc.) merg în{" "}
        <code className="rounded bg-zinc-100 px-1">dataLayer</code> (GTM-first) sau GA4 direct
        dacă GTM lipsește — fără PII, fără scripturi arbitrare.
      </FeedbackBanner>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.key}
            href={card.href}
            className="rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-teal-300 hover:bg-teal-50/40"
          >
            <p className="text-sm font-semibold text-zinc-900">{card.label}</p>
            <span
              className={`mt-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${statusClass(card.status)}`}
            >
              {marketingStatusLabelRo(card.status)}
            </span>
          </Link>
        ))}
      </div>

      <section className="rounded-lg border border-zinc-200 bg-white p-4 sm:p-5">
        <h3 className="text-base font-semibold text-zinc-900">Runtime & verification</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-600">
          <li>
            Verification publicată pe homepage:{" "}
            {cards.some(
              (c) =>
                ["gsc", "bing", "meta-domain", "pinterest"].includes(c.key) &&
                c.status === "configured",
            )
              ? "da (cel puțin un token configurat)"
              : "nu (niciun token)"}
          </li>
          <li>
            Analytics/Ads eligibile pentru load: doar cu consent + ID enabled. GTM are prioritate —
            pixeli nativi se încarcă doar dacă GTM lipsește.
          </li>
          <li>Custom head/body scripts: încă nu (v1).</li>
        </ul>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4 sm:p-5">
        <h3 className="text-base font-semibold text-zinc-900">SEO</h3>
        <p className="mt-1 text-sm text-zinc-600">
          Title templates, Open Graph, robots și sitemap rămân în Preferințe (Phase 2).
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-sm font-medium">
          <Link
            href="/dashboard/settings/marketing/seo"
            className="text-teal-800 underline-offset-2 hover:underline"
          >
            Deschide Marketing → SEO
          </Link>
          <Link
            href="/dashboard/settings/customization/preferences"
            className="text-teal-800 underline-offset-2 hover:underline"
          >
            Preferințe storefront
          </Link>
        </div>
      </section>
    </div>
  );
}
