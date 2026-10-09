"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label } from "@auto-platform/ui";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { inviteAcceptPath } from "@/lib/team/invite-paths";

type InviteSignupFormProps = {
  token: string;
  invitedEmail: string;
  tenantName: string | null;
};

/**
 * Controlled signup for invitees without an account.
 * Email is locked to the invitation address — no bypass to accept someone else's invite.
 */
export function InviteSignupForm({ token, invitedEmail, tenantName }: InviteSignupFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      if (password.length < 8) {
        setError("Parola trebuie să aibă cel puțin 8 caractere.");
        return;
      }

      const supabase = createSupabaseBrowserClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: invitedEmail,
        password,
        options: {
          data: { name: name.trim() || undefined },
        },
      });

      if (signUpError) {
        setError(mapSignUpError(signUpError.message));
        return;
      }

      if (!data.session) {
        // Email confirmation may be required in some Supabase projects.
        setError(
          "Contul a fost creat, dar sesiunea nu este activă. Confirmă emailul (dacă e necesar), apoi autentifică-te pentru a accepta invitația.",
        );
        return;
      }

      router.replace(inviteAcceptPath(token));
      router.refresh();
    } catch {
      setError("Nu am putut crea contul. Încearcă din nou.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full flex-col gap-4">
      {tenantName ? (
        <p className="rounded-md bg-zinc-100 px-3 py-2 text-sm text-zinc-700">
          Invitație pentru <span className="font-semibold">{tenantName}</span>
        </p>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="invite-email">Email</Label>
        <Input
          id="invite-email"
          name="email"
          type="email"
          value={invitedEmail}
          readOnly
          disabled
          autoComplete="email"
        />
        <p className="text-xs text-zinc-500">
          Emailul este fixat de invitație și nu poate fi schimbat.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="invite-name">Nume (opțional)</Label>
        <Input
          id="invite-name"
          name="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={pending}
          maxLength={120}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="invite-password">Parolă</Label>
        <Input
          id="invite-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={pending}
        />
      </div>

      {error ? (
        <p
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Se creează contul…" : "Creează cont și continuă"}
      </Button>
    </form>
  );
}

function mapSignUpError(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes("already registered") || normalized.includes("already been registered")) {
    return "Există deja un cont cu acest email. Autentifică-te pentru a accepta invitația.";
  }
  if (normalized.includes("password")) {
    return "Parola nu îndeplinește cerințele. Folosește cel puțin 8 caractere.";
  }
  return "Nu am putut crea contul. Verifică datele și încearcă din nou.";
}
