import type { TeamMemberRow } from "@/lib/settings/list-team-members";
import { FeedbackBanner } from "@/components/ui/feedback-banner";

type TeamSettingsPanelProps = {
  members: TeamMemberRow[];
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

export function TeamSettingsPanel({ members }: TeamSettingsPanelProps) {
  const ownerCount = members.filter((m) => m.role === "owner").length;

  return (
    <div className="flex flex-col gap-5">
      <FeedbackBanner variant="info">
        Invitațiile pe email, schimbarea de rol și eliminarea din echipă nu sunt active încă —
        acțiunile sunt dezactivate până există un flux sigur pe server. Lista de mai jos este
        doar pentru tenantul din Host.
      </FeedbackBanner>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-600">
          {members.length === 1
            ? "1 membru în organizație"
            : `${members.length} membri în organizație`}
        </p>
        <button
          type="button"
          disabled
          title="Invitațiile pe email vor fi disponibile într-o etapă ulterioară"
          className="inline-flex min-h-11 cursor-not-allowed items-center rounded-md bg-zinc-100 px-4 text-sm font-medium text-zinc-500 ring-1 ring-zinc-200"
        >
          Invită membru
        </button>
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
                <div className="flex flex-wrap gap-2 sm:shrink-0">
                  <button
                    type="button"
                    disabled
                    title="Schimbarea rolului necesită un server action dedicat"
                    className="inline-flex min-h-10 cursor-not-allowed items-center rounded-md bg-zinc-50 px-3 text-sm font-medium text-zinc-500 ring-1 ring-zinc-200"
                  >
                    Schimbă rol
                  </button>
                  <button
                    type="button"
                    disabled
                    title={
                      isSoleOwner
                        ? "Nu poți elimina ultimul proprietar"
                        : "Eliminarea necesită un server action dedicat"
                    }
                    className="inline-flex min-h-10 cursor-not-allowed items-center rounded-md bg-zinc-50 px-3 text-sm font-medium text-zinc-500 ring-1 ring-zinc-200"
                  >
                    Elimină
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
