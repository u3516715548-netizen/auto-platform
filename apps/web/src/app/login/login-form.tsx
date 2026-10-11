"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label } from "@auto-platform/ui";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { resolvePostLoginPath } from "@/lib/auth/auth-redirects";
import { checkoutPath, type SelfServePlanCode } from "@/lib/billing/plan-codes";
import { sanitizeInviteNextPath } from "@/lib/team/invite-paths";

type LoginFormProps = {
  tenantSlug: string | null;
  nextPath?: string | null;
  /** Apex self-serve plan (Etapa 26B). */
  plan?: SelfServePlanCode | null;
  /** Allow email signup on apex commercial flow. */
  allowSignup?: boolean;
};

export function LoginForm({
  tenantSlug,
  nextPath,
  plan = null,
  allowSignup = false,
}: LoginFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">(
    allowSignup && plan ? "signup" : "login",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const safeNext = sanitizeInviteNextPath(nextPath);

  function destinationAfterAuth(): string {
    if (safeNext) return resolvePostLoginPath(safeNext);
    if (plan) return checkoutPath(plan);
    return resolvePostLoginPath(null);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const supabase = createSupabaseBrowserClient();

      if (mode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { name: name.trim() || undefined },
          },
        });
        if (signUpError) {
          setError(mapSignUpError(signUpError.message));
          return;
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) {
          setError(mapSignInError(signInError.message));
          return;
        }
      }

      router.replace(destinationAfterAuth());
      router.refresh();
    } catch {
      setError(
        mode === "signup"
          ? "Înregistrarea a eșuat. Încearcă din nou."
          : "Autentificarea a eșuat. Încearcă din nou.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full flex-col gap-4">
      {plan ? (
        <p className="rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-900">
          După autentificare continui cu planul{" "}
          <span className="font-semibold">{plan}</span>.
        </p>
      ) : null}

      {tenantSlug ? (
        <p className="rounded-md bg-zinc-100 px-3 py-2 text-sm text-zinc-700">
          Dealer: <span className="font-semibold">{tenantSlug}</span>
        </p>
      ) : !plan ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Deschide login pe hostul dealerului (ex. acme.localhost:3000/login) pentru dashboard.
        </p>
      ) : null}

      {safeNext && !plan ? (
        <p className="rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-900">
          După autentificare vei reveni la invitație.
        </p>
      ) : null}

      {allowSignup ? (
        <div className="flex gap-2 text-sm">
          <button
            type="button"
            className={
              mode === "login"
                ? "font-semibold text-zinc-900 underline"
                : "text-zinc-500 hover:text-zinc-800"
            }
            onClick={() => setMode("login")}
            disabled={pending}
          >
            Am cont
          </button>
          <span className="text-zinc-300">|</span>
          <button
            type="button"
            className={
              mode === "signup"
                ? "font-semibold text-zinc-900 underline"
                : "text-zinc-500 hover:text-zinc-800"
            }
            onClick={() => setMode("signup")}
            disabled={pending}
          >
            Cont nou
          </button>
        </div>
      ) : null}

      {mode === "signup" ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Nume</Label>
          <Input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={pending}
            placeholder="Ion Popescu"
          />
        </div>
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
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          required
          minLength={mode === "signup" ? 8 : undefined}
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
        {pending
          ? mode === "signup"
            ? "Se creează contul…"
            : "Se autentifică…"
          : mode === "signup"
            ? "Creează cont"
            : "Intră în cont"}
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

function mapSignUpError(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes("already registered") || normalized.includes("already been registered")) {
    return "Emailul este deja folosit. Autentifică-te sau folosește alt email.";
  }
  if (normalized.includes("password")) {
    return "Parola este prea slabă. Folosește cel puțin 8 caractere.";
  }
  return "Nu am putut crea contul. Verifică datele și încearcă din nou.";
}
