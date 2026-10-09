import Link from "next/link";
import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { peekTenantInvitation } from "@/lib/team/peek-invitation";
import { parseInviteTokenParam } from "@/lib/team/invite-token";
import { loginPathForInviteAccept } from "@/lib/team/invite-paths";
import { membershipRoleLabel } from "@/lib/dashboard/role-label";
import { InviteAcceptForm } from "@/components/team/invite-accept-form";
import { InviteSignupForm } from "@/components/team/invite-signup-form";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { normalizeInvitationEmail } from "@auto-platform/types";
import type { MembershipRole } from "@auto-platform/core";

export default async function InviteAcceptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token: raw } = await params;
  const token = parseInviteTokenParam(raw);

  if (!token) {
    return (
      <InviteShell title="Invitație invalidă">
        <FeedbackBanner variant="error">
          Linkul de invitație nu este valid. Cere o invitație nouă proprietarului.
        </FeedbackBanner>
      </InviteShell>
    );
  }

  const peek = await peekTenantInvitation(token);

  if (peek.outcome === "expired") {
    return (
      <InviteShell title="Invitație expirată">
        <FeedbackBanner variant="error">
          Invitația a expirat. Cere o invitație nouă proprietarului.
        </FeedbackBanner>
      </InviteShell>
    );
  }

  if (peek.outcome === "revoked") {
    return (
      <InviteShell title="Invitație revocată">
        <FeedbackBanner variant="error">
          Invitația nu mai este valabilă. Cere o invitație nouă proprietarului.
        </FeedbackBanner>
      </InviteShell>
    );
  }

  if (peek.outcome === "accepted") {
    return (
      <InviteShell title="Invitație folosită">
        <FeedbackBanner variant="info">
          Această invitație a fost deja acceptată. Autentifică-te pentru a accesa dashboard-ul.
        </FeedbackBanner>
        <Link
          href="/login"
          className="text-sm font-medium text-teal-800 underline underline-offset-2"
        >
          Mergi la autentificare
        </Link>
      </InviteShell>
    );
  }

  if (peek.outcome !== "pending" || !peek.email) {
    return (
      <InviteShell title="Invitație indisponibilă">
        <FeedbackBanner variant="error">
          Nu am putut valida invitația. Linkul poate fi greșit sau nu mai este activ.
        </FeedbackBanner>
      </InviteShell>
    );
  }

  const user = await getCurrentUser();
  const roleLabel = peek.role
    ? membershipRoleLabel(peek.role as MembershipRole)
    : null;
  const invitedEmail = peek.email;

  if (!user) {
    return (
      <InviteShell title="Acceptă invitația">
        <p className="text-sm leading-6 text-zinc-600">
          {peek.tenantName
            ? `Ai fost invitat(ă) în ${peek.tenantName}.`
            : "Ai fost invitat(ă) într-o organizație."}
          {roleLabel ? ` Rol: ${roleLabel}.` : null}
        </p>

        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-3">
            <h2 className="text-base font-semibold text-zinc-900">Ai deja cont?</h2>
            <Link
              href={loginPathForInviteAccept(token)}
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-teal-800 px-4 text-sm font-medium text-white hover:bg-teal-900"
            >
              Autentifică-te pentru a accepta
            </Link>
          </section>

          <div className="border-t border-zinc-200 pt-6">
            <h2 className="mb-3 text-base font-semibold text-zinc-900">Creează un cont nou</h2>
            <InviteSignupForm
              token={token}
              invitedEmail={invitedEmail}
              tenantName={peek.tenantName}
            />
          </div>
        </div>
      </InviteShell>
    );
  }

  const accountEmail = normalizeInvitationEmail(user.email ?? user.profile?.email ?? "");
  const inviteEmailNorm = normalizeInvitationEmail(invitedEmail);

  if (!accountEmail || !inviteEmailNorm || accountEmail !== inviteEmailNorm) {
    return (
      <InviteShell title="Email nepotrivit">
        <FeedbackBanner variant="error">
          Contul autentificat nu folosește adresa din invitație. Ieși din cont și autentifică-te
          cu emailul invitat, sau creează un cont nou pe acea adresă.
        </FeedbackBanner>
        <Link
          href="/login"
          className="text-sm font-medium text-teal-800 underline underline-offset-2"
        >
          Schimbă contul
        </Link>
      </InviteShell>
    );
  }

  return (
    <InviteShell title="Acceptă invitația">
      <InviteAcceptForm token={token} tenantName={peek.tenantName} roleLabel={roleLabel} />
    </InviteShell>
  );
}

function InviteShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium tracking-wide text-teal-800 uppercase">Echipă</p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{title}</h1>
      </div>
      {children}
      <p className="text-center text-sm text-zinc-500">
        <Link href="/" className="underline underline-offset-2 hover:text-zinc-800">
          Înapoi la pagina principală
        </Link>
      </p>
    </main>
  );
}
