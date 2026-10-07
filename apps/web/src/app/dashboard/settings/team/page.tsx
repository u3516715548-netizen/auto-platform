import { requireSettingsOwner } from "@/lib/auth/require-settings-owner";
import { listTeamMembers } from "@/lib/settings/list-team-members";
import { TeamSettingsPanel } from "@/components/dashboard/team-settings-panel";
import { FeedbackBanner } from "@/components/ui/feedback-banner";

/**
 * Team administration — owner only (404 for other roles).
 */
export default async function DashboardSettingsTeamPage() {
  const session = await requireSettingsOwner();

  let members: Awaited<ReturnType<typeof listTeamMembers>> = [];
  let listError: string | null = null;
  try {
    members = await listTeamMembers();
  } catch {
    members = [];
    listError = "Nu am putut încărca echipa. Reîncarcă pagina sau încearcă mai târziu.";
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <p className="text-sm font-medium tracking-wide text-teal-800 uppercase">Setări</p>
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">Echipa</h2>
        <p className="max-w-2xl text-sm leading-6 text-zinc-600">
          Conturile cu acces la{" "}
          <span className="font-medium text-zinc-800">{session.tenant.name}</span>. Doar
          proprietarul poate vedea această pagină.
        </p>
      </section>

      {listError ? <FeedbackBanner variant="error">{listError}</FeedbackBanner> : null}

      {!listError ? <TeamSettingsPanel members={members} /> : null}
    </div>
  );
}
