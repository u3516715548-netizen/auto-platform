"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button, Input, Label } from "@auto-platform/ui";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import {
  createTenantInvitationAction,
  type TeamActionState,
} from "@/lib/team/create-invitation";
import { INVITABLE_MEMBERSHIP_ROLES } from "@auto-platform/types";

const initialState: TeamActionState = { error: null, success: false };

const ROLE_OPTIONS: Array<{ value: (typeof INVITABLE_MEMBERSHIP_ROLES)[number]; label: string }> =
  [
    { value: "manager", label: "Manager" },
    { value: "sales", label: "Vânzări" },
    { value: "viewer", label: "Vizualizare" },
  ];

export function TeamInviteForm() {
  const [state, formAction, pending] = useActionState(createTenantInvitationAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
    }
  }, [state?.success]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-4"
    >
      <div>
        <h3 className="text-base font-semibold text-zinc-900">Invită membru</h3>
        <p className="mt-1 text-sm text-zinc-600">
          Trimite o invitație pe email (în această etapă livrarea este noop/log — fără inbox
          real).
        </p>
      </div>

      {state?.success ? (
        <FeedbackBanner variant="success">Invitația a fost creată.</FeedbackBanner>
      ) : null}
      {state?.error ? <FeedbackBanner variant="error">{state.error}</FeedbackBanner> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 sm:col-span-1">
          <Label htmlFor="invite-email">Email</Label>
          <Input
            id="invite-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={160}
            disabled={pending}
            placeholder="coleg@firma.ro"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="invite-role">Rol</Label>
          <select
            id="invite-role"
            name="role"
            required
            disabled={pending}
            defaultValue="viewer"
            className="min-h-11 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900"
          >
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Se trimite…" : "Invită"}
        </Button>
      </div>
    </form>
  );
}
