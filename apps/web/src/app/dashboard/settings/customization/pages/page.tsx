import { requireSettingsOwner } from "@/lib/auth/require-settings-owner";
import { FeedbackBanner } from "@/components/ui/feedback-banner";

/**
 * Content pages admin — placeholder for a later stage.
 */
export default async function DashboardSettingsPagesPage() {
  await requireSettingsOwner();

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <p className="text-sm font-medium tracking-wide text-teal-800 uppercase">Personalizare</p>
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">Pagini</h2>
        <p className="max-w-2xl text-sm leading-6 text-zinc-600">
          Aici vei administra paginile de conținut ale site-ului public al dealerului.
        </p>
      </section>

      <FeedbackBanner variant="info">
        Editorul de pagini nu este disponibil în această etapă. Nu se fac migrări, publish sau SEO
        real încă.
      </FeedbackBanner>

      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <h3 className="text-base font-semibold text-zinc-900">Pregătit pentru etape ulterioare</h3>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          Vom putea gestiona aici pagini precum:
        </p>
        <ul className="mt-3 list-inside list-disc space-y-1.5 text-sm text-zinc-700">
          <li>Despre noi</li>
          <li>Contact</li>
          <li>Termeni și condiții</li>
          <li>Politica de confidențialitate</li>
          <li>Politica cookies</li>
        </ul>
      </div>
    </div>
  );
}
