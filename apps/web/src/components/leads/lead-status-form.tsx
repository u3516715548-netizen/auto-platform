"use client";

import { useActionState } from "react";
import { Button, Label } from "@auto-platform/ui";
import type { LeadStatus } from "@auto-platform/types";
import {
  updateLeadStatusAction,
  type UpdateLeadStatusState,
} from "@/lib/leads/update-lead-status";
import { leadStatusLabel } from "@/lib/leads/status-label";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { nativeSelectClassName } from "@/lib/ui/form-styles";

const initialState: UpdateLeadStatusState = { error: null };

const STATUSES: LeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "won",
  "lost",
  "archived",
];

type LeadStatusFormProps = {
  leadId: string;
  currentStatus: LeadStatus;
  readOnly?: boolean;
};

export function LeadStatusForm({
  leadId,
  currentStatus,
  readOnly = false,
}: LeadStatusFormProps) {
  const [state, formAction, pending] = useActionState(updateLeadStatusAction, initialState);

  if (readOnly) {
    return (
      <p className="rounded-md bg-zinc-100 px-3 py-2.5 text-sm text-zinc-800">
        Status: <span className="font-medium">{leadStatusLabel(currentStatus)}</span>
      </p>
    );
  }

  return (
    <form action={formAction} className="flex min-w-0 flex-col gap-3">
      <input type="hidden" name="leadId" value={leadId} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="lead-status">Status</Label>
        <select
          id="lead-status"
          name="status"
          defaultValue={currentStatus}
          disabled={pending}
          className={nativeSelectClassName}
        >
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {leadStatusLabel(status)}
            </option>
          ))}
        </select>
      </div>
      {state?.error ? <FeedbackBanner variant="error">{state.error}</FeedbackBanner> : null}
      <Button type="submit" variant="secondary" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Se actualizează…" : "Actualizează status"}
      </Button>
    </form>
  );
}
