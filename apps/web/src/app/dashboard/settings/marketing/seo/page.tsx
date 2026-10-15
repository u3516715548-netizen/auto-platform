import Link from "next/link";
import { requireSettingsOwner } from "@/lib/auth/require-settings-owner";
import { FeedbackBanner } from "@/components/ui/feedback-banner";

/**
 * Marketing → SEO bridge. SEO Core (Phase 2) stays on Preferințe; no duplicated form.
 */
export default async function DashboardMarketingSeoPage() {
  const session = await requireSettingsOwner();

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <p className="text-sm font-medium tracking-wide text-teal-800 uppercase">Marketing</p>
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">SEO</h2>
        <p className="max-w-2xl text-sm leading-6 text-zinc-600">
          Setările SEO pentru{" "}
          <span className="font-medium text-zinc-800">{session.tenant.name}</span> (title, meta, OG,
          indexing) sunt gestionate în Preferințe. robots.txt și sitemap.xml sunt generate pe Host.
        </p>
      </section>

      <FeedbackBanner variant="info">
        Nu duplicăm formularul SEO aici. Editează valorile în Preferințe; Marketing rămâne hub-ul
        pentru Analytics, Ads și Verification.
      </FeedbackBanner>

      <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 sm:p-5 sm:flex-row sm:flex-wrap">
        <Link
          href="/dashboard/settings/customization/preferences"
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-teal-800 px-4 text-sm font-semibold text-white hover:bg-teal-900"
        >
          Deschide Preferințe SEO
        </Link>
        <Link
          href="/dashboard/settings/customization/pages"
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-zinc-200 px-4 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
        >
          Pagini CMS / landing SEO
        </Link>
        <Link
          href="/dashboard/settings/marketing/health"
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-zinc-200 px-4 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
        >
          SEO Health
        </Link>
      </div>
    </div>
  );
}
