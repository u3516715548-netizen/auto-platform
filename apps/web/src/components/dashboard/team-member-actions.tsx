"use client";

import { useActionState } from "react";
import { Button } from "@auto-platform/ui";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { changeMemberRoleAction } from "@/lib/team/change-member-role";
import { removeMemberAction } from "@/lib/team/remove-member";
import type { TeamActionState } from "@/lib/team/team-action-state";
import { INVITABLE_MEMBERSHIP_ROLES } from "@auto-platform/types";
import type { MembershipRole } from "@auto-platform/core";

const initial: TeamActionState = { error: null, success: false };

type Props = {
  membershipId: string;
  currentRole: MembershipRole;
  canChangeRole: boolean;
  canRemove: boolean;
  removeDisabledReason?: string;
};

const ROLE_OPTIONS: Array<{ value: (typeof INVITABLE_MEMBERSHIP_ROLES)[number]; label: string }> =
  [
    { value: "manager", label: "Manager" },
    { value: "sales", label: "Vânzări" },
    { value: "viewer", label: "Vizualizare" },
  ];

export function TeamMemberActions({
  membershipId,
  currentRole,
  canChangeRole,
  canRemove,
  removeDisabledReason,
}: Props) {
  const [roleState, roleAction, rolePending] = useActionState(changeMemberRoleAction, initial);
  const [removeState, removeAction, removePending] = useActionState(removeMemberAction, initial);

  const error = roleState?.error ?? removeState?.error;
  const success = roleState?.success || removeState?.success;
  const defaultRole =
    currentRole === "owner"
      ? "manager"
      : (ROLE_OPTIONS.find((o) => o.value === currentRole)?.value ?? "viewer");

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      {error ? <FeedbackBanner variant="error">{error}</FeedbackBanner> : null}
      {success && !error ? (
        <FeedbackBanner variant="success">Actualizat.</FeedbackBanner>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {canChangeRole ? (
          <form action={roleAction} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="membershipId" value={membershipId} />
            <select
              name="role"
              defaultValue={defaultRole}
              disabled={rolePending || removePending}
              className="min-h-10 rounded-md border border-zinc-300 bg-white px-2 text-sm text-zinc-900"
              aria-label="Rol nou"
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <Button type="submit" variant="secondary" disabled={rolePending || removePending}>
              {rolePending ? "Se salvează…" : "Schimbă rol"}
            </Button>
          </form>
        ) : null}

        {canRemove ? (
          <form action={removeAction}>
            <input type="hidden" name="membershipId" value={membershipId} />
            <Button type="submit" variant="secondary" disabled={removePending || rolePending}>
              {removePending ? "Se elimină…" : "Elimină"}
            </Button>
          </form>
        ) : (
          <button
            type="button"
            disabled
            title={removeDisabledReason ?? "Acțiune indisponibilă"}
            className="inline-flex min-h-10 cursor-not-allowed items-center rounded-md bg-zinc-50 px-3 text-sm font-medium text-zinc-500 ring-1 ring-zinc-200"
          >
            Elimină
          </button>
        )}
      </div>
    </div>
  );
}
