"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label } from "@auto-platform/ui";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { resolvePostLoginPath } from "@/lib/auth/auth-redirects";
import { sanitizeInviteNextPath } from "@/lib/team/invite-paths";

type LoginFormProps = {
  tenantSlug: string | null;
  nextPath?: string | null;
};

export function LoginForm({ tenantSlug, nextPath }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const safeNext = sanitizeInviteNextPath(nextPath);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError(mapSignInError(signInError.message));
        return;
      }

      // Relative path keeps acme/beta host — never bounce to apex localhost.
      router.replace(resolvePostLoginPath(safeNext));
      router.refresh();
    } catch {
      setError("Autentificarea a eșuat. Încearcă din nou.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full flex-col gap-4">
      {tenantSlug ? (
        <p className="rounded-md bg-zinc-100 px-3 py-2 text-sm text-zinc-700">
          Dealer: <span className="font-semibold">{tenantSlug}</span>
        </p>
      ) : (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Deschide login pe hostul dealerului (ex. acme.localhost:3000/login) pentru dashboard.
        </p>
      )}

      {safeNext ? (
        <p className="rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-900">
          După autentificare vei reveni la invitație.
        </p>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={pending}
          placeholder="alice@acme.test"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Parolă</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={pending}
        />
      </div>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Se autentifică…" : "Intră în cont"}
      </Button>
    </form>
  );
}

function mapSignInError(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid login credentials")) {
    return "Email sau parolă incorrectă.";
  }
  if (normalized.includes("email not confirmed")) {
    return "Emailul nu este confirmat. Verifică inbox-ul sau confirmă userul în Supabase Auth.";
  }
  return "Nu am putut autentifica. Verifică datele și încearcă din nou.";
}
