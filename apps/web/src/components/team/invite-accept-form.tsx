"use client";

import { useActionState } from "react";
import { Button } from "@auto-platform/ui";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import {
  acceptTenantInvitationAction,
  type AcceptInvitationState,
} from "@/lib/team/accept-invitation";

const initialState: AcceptInvitationState = { error: null, success: false };

type InviteAcceptFormProps = {
  token: string;
  tenantName: string | null;
  roleLabel: string | null;
};

export function InviteAcceptForm({ token, tenantName, roleLabel }: InviteAcceptFormProps) {
  const [state, formAction, pending] = useActionState(acceptTenantInvitationAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />

      {tenantName ? (
        <p className="text-sm text-zinc-700">
          Vei primi acces la <span className="font-semibold text-zinc-900">{tenantName}</span>
          {roleLabel ? (
            <>
              {" "}
              ca <span className="font-medium">{roleLabel}</span>
            </>
          ) : null}
          .
        </p>
      ) : null}

      {state?.error ? <FeedbackBanner variant="error">{state.error}</FeedbackBanner> : null}

      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Se acceptă…" : "Acceptă invitația"}
      </Button>
    </form>
  );
}
