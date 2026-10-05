"use client";

import { useActionState } from "react";
import { Button, Label } from "@auto-platform/ui";
import {
  assignLeadAction,
  type AssignLeadState,
} from "@/lib/leads/assign-lead";
import type { LeadAssigneeOption } from "@/lib/leads/list-assignees";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { nativeSelectClassName } from "@/lib/ui/form-styles";

const initialState: AssignLeadState = { error: null };

type LeadAssignFormProps = {
  leadId: string;
  currentAssignedTo: string | null;
  options: LeadAssigneeOption[];
  readOnly?: boolean;
  readOnlyLabel?: string;
};

export function LeadAssignForm({
  leadId,
  currentAssignedTo,
  options,
  readOnly = false,
  readOnlyLabel = "Neatribuit",
}: LeadAssignFormProps) {
  const [state, formAction, pending] = useActionState(assignLeadAction, initialState);

  if (readOnly) {
    return (
      <p className="rounded-md bg-zinc-100 px-3 py-2.5 text-sm text-zinc-800">
        Atribuit: <span className="font-medium">{readOnlyLabel}</span>
      </p>
    );
  }

  return (
    <form action={formAction} className="flex min-w-0 flex-col gap-3">
      <input type="hidden" name="leadId" value={leadId} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="lead-assignee">Atribuit către</Label>
        <select
          id="lead-assignee"
          name="assignedTo"
          defaultValue={currentAssignedTo ?? "__none__"}
          disabled={pending}
          className={nativeSelectClassName}
        >
          <option value="__none__">Neatribuit</option>
          {options.map((option) => (
            <option key={option.profileId} value={option.profileId}>
              {option.displayName}
            </option>
          ))}
        </select>
      </div>
      {state?.error ? <FeedbackBanner variant="error">{state.error}</FeedbackBanner> : null}
      <Button type="submit" variant="secondary" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Se salvează…" : "Salvează atribuirea"}
      </Button>
    </form>
  );
}
