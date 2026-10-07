"use client";

import { useActionState } from "react";
import { Button, Input, Label } from "@auto-platform/ui";
import {
  updateOwnProfileAction,
  type UpdateOwnProfileState,
} from "@/lib/settings/update-own-profile";
import { FeedbackBanner } from "@/components/ui/feedback-banner";

const initialState: UpdateOwnProfileState = { error: null, success: false };

type ProfileSettingsFormProps = {
  name: string;
  email: string;
  roleLabel: string;
};

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

export function ProfileSettingsForm({
  name,
  email,
  roleLabel,
}: ProfileSettingsFormProps) {
  const [state, formAction, pending] = useActionState(
    updateOwnProfileAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-5">
      {state?.error ? (
        <FeedbackBanner variant="error">{state.error}</FeedbackBanner>
      ) : null}
      {state?.success ? (
        <FeedbackBanner variant="success">Profilul a fost salvat.</FeedbackBanner>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div
          className="flex size-16 shrink-0 items-center justify-center rounded-full bg-teal-800 text-lg font-semibold text-white"
          aria-hidden
        >
          {initialsFromName(name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-zinc-900">Poză de profil</p>
          <p className="mt-1 text-sm leading-6 text-zinc-600">
            Upload-ul de avatar nu este disponibil încă. Va necesita coloană pe profil și un
            bucket Storage dedicat.
          </p>
          <label className="mt-2 inline-flex min-h-10 cursor-not-allowed items-center rounded-md bg-zinc-100 px-3 text-sm font-medium text-zinc-500 ring-1 ring-zinc-200">
            Încarcă imagine
            <input type="file" accept="image/*" disabled className="sr-only" />
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="profile-name">Nume afișat</Label>
        <Input
          id="profile-name"
          name="name"
          type="text"
          defaultValue={name}
          required
          maxLength={80}
          disabled={pending}
          autoComplete="name"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="profile-email">Email</Label>
        <Input
          id="profile-email"
          type="email"
          value={email}
          readOnly
          disabled
          className="bg-zinc-50 text-zinc-600"
        />
        <p className="text-xs text-zinc-500">
          Schimbarea emailului nu este implementată în acest flux. Contactează suportul dacă este
          necesar.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="profile-role">Rol în organizație</Label>
        <Input
          id="profile-role"
          type="text"
          value={roleLabel}
          readOnly
          disabled
          className="bg-zinc-50 text-zinc-600"
        />
      </div>

      <section className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-3">
        <h3 className="text-sm font-semibold text-zinc-900">Parolă</h3>
        <p className="mt-1 text-sm leading-6 text-zinc-600">
          Schimbarea parolei prin dashboard — în curând (flux Supabase Auth dedicat).
        </p>
      </section>

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Se salvează…" : "Salvează profilul"}
        </Button>
      </div>
    </form>
  );
}
