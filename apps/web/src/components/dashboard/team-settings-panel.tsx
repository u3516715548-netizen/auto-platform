import type { TeamMemberRow } from "@/lib/settings/list-team-members";
import type { PendingInvitationRow } from "@/lib/team/list-pending-invitations";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { TeamInviteForm } from "@/components/dashboard/team-invite-form";
import { TeamInvitationActions } from "@/components/dashboard/team-invitation-actions";
import { TeamMemberActions } from "@/components/dashboard/team-member-actions";

type TeamSettingsPanelProps = {
  members: TeamMemberRow[];
  invitations: PendingInvitationRow[];
};

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

function formatJoinedAt(iso: string): string {
  try {
    return new Intl.DateTimeFormat("ro-RO", {
      dateStyle: "medium",
    }).format(new Date(iso));
  } catch {
    return "—";
  }
}

export function TeamSettingsPanel({ members, invitations }: TeamSettingsPanelProps) {
  const ownerCount = members.filter((m) => m.role === "owner").length;

  return (
    <div className="flex flex-col gap-8">
      <FeedbackBanner variant="info">
        Invitațiile sunt create în aplicație; livrarea pe email este noop/log în această etapă
        (fără inbox real). Doar proprietarul poate invita, revoca, schimba roluri sau elimina
        membri. Rolul proprietar nu poate fi atribuit prin invitație.
      </FeedbackBanner>

      <TeamInviteForm />

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-zinc-900">Invitații în așteptare</h3>
          <p className="text-sm text-zinc-600">
            {invitations.length === 0
              ? "Nicio invitație pending"
              : invitations.length === 1
                ? "1 invitație pending"
                : `${invitations.length} invitații pending`}
          </p>
        </div>

        {invitations.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 bg-white px-4 py-8 text-center">
            <p className="text-sm text-zinc-600">Nu există invitații pending pentru acest dealer.</p>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white">
            {invitations.map((invite) => (
              <li
                key={invite.invitationId}
                className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-900">{invite.email}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-md bg-zinc-100 px-2 py-1 font-medium text-zinc-800">
                      {invite.roleLabel}
                    </span>
                    <span className="rounded-md bg-amber-50 px-2 py-1 font-medium text-amber-900">
                      Pending
                    </span>
                    <span className="rounded-md bg-zinc-50 px-2 py-1 text-zinc-600">
                      Expiră {formatJoinedAt(invite.expiresAt)}
                    </span>
                  </div>
                </div>
                <TeamInvitationActions invitationId={invite.invitationId} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-zinc-900">Membri</h3>
          <p className="text-sm text-zinc-600">
            {members.length === 1
              ? "1 membru în organizație"
              : `${members.length} membri în organizație`}
          </p>
        </div>

        {members.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 bg-white px-4 py-10 text-center">
            <p className="text-base font-medium text-zinc-900">Niciun membru găsit.</p>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-zinc-600">
              Membrii apar aici după ce au un membership pe dealerul curent.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white">
            {members.map((member) => {
              const isSoleOwner = member.role === "owner" && ownerCount <= 1;
              const canChangeRole = member.role !== "owner" || ownerCount > 1;
              const canRemove = !isSoleOwner;

              return (
                <li
                  key={member.membershipId}
                  className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div
                      className="flex size-11 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-zinc-700"
                      aria-hidden
                    >
                      {initialsFromName(member.displayName)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-900">
                        {member.displayName}
                        {member.isSelf ? (
                          <span className="ml-2 text-xs font-medium text-teal-800">(tu)</span>
                        ) : null}
                      </p>
                      <p className="mt-0.5 truncate text-sm text-zinc-600">
                        {member.email ?? "Email indisponibil (RLS profil)"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-md bg-zinc-100 px-2 py-1 font-medium text-zinc-800">
                          {member.roleLabel}
                        </span>
                        <span className="rounded-md bg-emerald-50 px-2 py-1 font-medium text-emerald-800">
                          Activ
                        </span>
                        <span className="rounded-md bg-zinc-50 px-2 py-1 text-zinc-600">
                          Adăugat {formatJoinedAt(member.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <TeamMemberActions
                    membershipId={member.membershipId}
                    currentRole={member.role}
                    canChangeRole={canChangeRole}
                    canRemove={canRemove}
                    removeDisabledReason={
                      isSoleOwner ? "Nu poți elimina ultimul proprietar" : undefined
                    }
                  />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
