"use client";

import { useActionState } from "react";
import { Button } from "@auto-platform/ui";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { revokeTenantInvitationAction } from "@/lib/team/revoke-invitation";
import { resendTenantInvitationAction } from "@/lib/team/resend-invitation";
import type { TeamActionState } from "@/lib/team/team-action-state";

const initial: TeamActionState = { error: null, success: false };

type Props = {
  invitationId: string;
};

export function TeamInvitationActions({ invitationId }: Props) {
  const [revokeState, revokeAction, revokePending] = useActionState(
    revokeTenantInvitationAction,
    initial,
  );
  const [resendState, resendAction, resendPending] = useActionState(
    resendTenantInvitationAction,
    initial,
  );

  const error = revokeState?.error ?? resendState?.error;
  const success = revokeState?.success || resendState?.success;

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      {error ? <FeedbackBanner variant="error">{error}</FeedbackBanner> : null}
      {success && !error ? (
        <FeedbackBanner variant="success">Actualizat.</FeedbackBanner>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <form action={resendAction}>
          <input type="hidden" name="invitationId" value={invitationId} />
          <Button type="submit" variant="secondary" disabled={resendPending || revokePending}>
            {resendPending ? "Se retrimite…" : "Retrimite"}
          </Button>
        </form>
        <form action={revokeAction}>
          <input type="hidden" name="invitationId" value={invitationId} />
          <Button type="submit" variant="secondary" disabled={revokePending || resendPending}>
            {revokePending ? "Se revocă…" : "Revocă"}
          </Button>
        </form>
      </div>
    </div>
  );
}
