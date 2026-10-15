import Link from "next/link";
import { requireSettingsOwner } from "@/lib/auth/require-settings-owner";
import { runSeoHealthForOwnerSession } from "@/lib/seo/health/run-seo-health";
import { SeoHealthReportView } from "@/components/dashboard/seo-health-report";
import { FeedbackBanner } from "@/components/ui/feedback-banner";

/**
 * Owner-only SEO Health — on-demand checks for the session tenant.
 * Never accepts tenantId from query; no public exposure of internals.
 */
export default async function DashboardMarketingSeoHealthPage() {
  const session = await requireSettingsOwner();
  const report = await runSeoHealthForOwnerSession(session, { includeLive: true });

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <p className="text-sm font-medium tracking-wide text-teal-800 uppercase">Marketing</p>
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">SEO Health</h2>
        <p className="max-w-2xl text-sm leading-6 text-zinc-600">
          Verificări pe storefront-ul{" "}
          <span className="font-medium text-zinc-800">{session.tenant.name}</span>: metadata, CMS,
          sitemap, robots, consent și verification — fără cross-tenant.
        </p>
      </section>

      <FeedbackBanner variant="info">
        Scorul intern nu este un „Google score”. Critical = acțiune necesară; Warning = îmbunătățire;
        Info = stare intenționată / neconfigurat.{" "}
        <Link
          href="/dashboard/settings/customization/preferences"
          className="font-medium text-teal-900 underline-offset-2 hover:underline"
        >
          Preferințe SEO
        </Link>
        {" · "}
        <Link
          href="/dashboard/settings/customization/pages"
          className="font-medium text-teal-900 underline-offset-2 hover:underline"
        >
          Pagini CMS
        </Link>
      </FeedbackBanner>

      <SeoHealthReportView report={report} />
    </div>
  );
}
