import Link from "next/link";
import { notFound } from "next/navigation";
import { getTenantLeadById } from "@/lib/leads/list-leads";
import { listLeadAssignableMembers } from "@/lib/leads/list-assignees";
import { canMutateLead } from "@/lib/leads/permissions";
import { formatLeadDateTimeRo } from "@/lib/leads/lead-list-filter";
import {
  leadSourceLabel,
  leadStatusBadgeClass,
  leadStatusLabel,
} from "@/lib/leads/status-label";
import { leadMailtoHref, leadTelHref } from "@/lib/leads/lead-contact-links";
import { leadsPath, vehicleEditPath } from "@/lib/dashboard/nav";
import { LeadStatusForm } from "@/components/leads/lead-status-form";
import { LeadAssignForm } from "@/components/leads/lead-assign-form";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { secondaryLinkClassName } from "@/lib/ui/form-styles";

type PageProps = {
  params: Promise<{ leadId: string }>;
  searchParams: Promise<{ status?: string; assigned?: string }>;
};

/**
 * Lead detail (10B). Cross-tenant / invalid id → 404.
 */
export default async function DashboardLeadDetailPage({ params, searchParams }: PageProps) {
  const { leadId } = await params;
  const query = await searchParams;
  const access = await getTenantLeadById(leadId);

  if (!access) {
    notFound();
  }

  const { lead, session } = access;
  const canMutate = canMutateLead(session.membership.role);
  const assignees = canMutate ? await listLeadAssignableMembers() : [];
  const mailto = leadMailtoHref(lead.email);
  const tel = leadTelHref(lead.phone);
  const sourceLabel = leadSourceLabel(lead.source);

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-2xl flex-col gap-5 sm:gap-6">
      <header className="flex min-w-0 flex-col gap-2">
        <p className="text-sm font-medium tracking-wide text-teal-800 uppercase">Lead-uri</p>
        <h2 className="break-words text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">
          {lead.name}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium ${leadStatusBadgeClass(lead.status)}`}
          >
            {leadStatusLabel(lead.status)}
          </span>
          <time className="text-sm text-zinc-600" dateTime={lead.createdAt.toISOString()}>
            {formatLeadDateTimeRo(lead.createdAt)}
          </time>
        </div>
        <p className="text-sm leading-6 text-zinc-600">
          {canMutate
            ? "Actualizează statusul sau atribuirea pentru dealerul curent."
            : "Vizualizare read-only — rolul tău nu permite modificări."}
        </p>
      </header>

      {query.status === "1" ? (
        <FeedbackBanner variant="success">Statusul a fost actualizat.</FeedbackBanner>
      ) : null}
      {query.assigned === "1" ? (
        <FeedbackBanner variant="success">Atribuirea a fost salvată.</FeedbackBanner>
      ) : null}
      {!canMutate ? (
        <FeedbackBanner variant="info">
          Contul are rol de vizualizare. Poți citi detaliile, dar serverul respinge orice mutație.
        </FeedbackBanner>
      ) : null}

      <section
        aria-labelledby="lead-contact-heading"
        className="rounded-lg border border-zinc-200 bg-white p-3 sm:p-5"
      >
        <h3 id="lead-contact-heading" className="mb-4 text-base font-semibold text-zinc-900">
          Contact
        </h3>
        <dl className="grid gap-3 text-sm">
          {lead.email ? (
            <div>
              <dt className="text-xs font-medium tracking-wide text-zinc-500 uppercase">Email</dt>
              <dd className="mt-1 break-all text-zinc-900">
                {mailto ? (
                  <a href={mailto} className="underline-offset-2 hover:underline">
                    {lead.email}
                  </a>
                ) : (
                  lead.email
                )}
              </dd>
            </div>
          ) : null}
          {lead.phone ? (
            <div>
              <dt className="text-xs font-medium tracking-wide text-zinc-500 uppercase">Telefon</dt>
              <dd className="mt-1 break-all text-zinc-900">
                {tel ? (
                  <a href={tel} className="underline-offset-2 hover:underline">
                    {lead.phone}
                  </a>
                ) : (
                  lead.phone
                )}
              </dd>
            </div>
          ) : null}
          {!lead.email && !lead.phone ? (
            <p className="text-zinc-600">Fără date de contact.</p>
          ) : null}
        </dl>
        {(mailto || tel) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {mailto ? (
              <a href={mailto} className={secondaryLinkClassName}>
                Trimite email
              </a>
            ) : null}
            {tel ? (
              <a href={tel} className={secondaryLinkClassName}>
                Sună
              </a>
            ) : null}
          </div>
        )}
      </section>

      <section
        aria-labelledby="lead-message-heading"
        className="rounded-lg border border-zinc-200 bg-white p-3 sm:p-5"
      >
        <h3 id="lead-message-heading" className="mb-3 text-base font-semibold text-zinc-900">
          Mesaj
        </h3>
        {lead.message ? (
          <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-800">{lead.message}</p>
        ) : (
          <p className="text-sm text-zinc-600">Fără mesaj.</p>
        )}
      </section>

      <section
        aria-labelledby="lead-meta-heading"
        className="rounded-lg border border-zinc-200 bg-white p-3 sm:p-5"
      >
        <h3 id="lead-meta-heading" className="mb-4 text-base font-semibold text-zinc-900">
          Detalii
        </h3>
        <dl className="grid gap-3 text-sm">
          <div>
            <dt className="text-xs font-medium tracking-wide text-zinc-500 uppercase">Vehicul</dt>
            <dd className="mt-1 text-zinc-900">
              {lead.vehicle ? (
                <Link
                  href={vehicleEditPath(lead.vehicle.id)}
                  className="underline-offset-2 hover:underline"
                >
                  {lead.vehicle.make} {lead.vehicle.model}
                </Link>
              ) : (
                "—"
              )}
            </dd>
          </div>
          {sourceLabel ? (
            <div>
              <dt className="text-xs font-medium tracking-wide text-zinc-500 uppercase">Sursă</dt>
              <dd className="mt-1 text-zinc-900">{sourceLabel}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-xs font-medium tracking-wide text-zinc-500 uppercase">Actualizat</dt>
            <dd className="mt-1 text-zinc-900">
              <time dateTime={lead.updatedAt.toISOString()}>
                {formatLeadDateTimeRo(lead.updatedAt)}
              </time>
            </dd>
          </div>
        </dl>
      </section>

      <section
        aria-labelledby="lead-status-heading"
        className="rounded-lg border border-zinc-200 bg-white p-3 sm:p-5"
      >
        <h3 id="lead-status-heading" className="mb-4 text-base font-semibold text-zinc-900">
          Status
        </h3>
        <LeadStatusForm
          leadId={lead.id}
          currentStatus={lead.status}
          readOnly={!canMutate}
        />
      </section>

      <section
        aria-labelledby="lead-assign-heading"
        className="rounded-lg border border-zinc-200 bg-white p-3 sm:p-5"
      >
        <h3 id="lead-assign-heading" className="mb-4 text-base font-semibold text-zinc-900">
          Atribuire
        </h3>
        <LeadAssignForm
          leadId={lead.id}
          currentAssignedTo={lead.assignee?.profileId ?? null}
          options={assignees}
          readOnly={!canMutate}
          readOnlyLabel={lead.assignee?.displayName ?? "Neatribuit"}
        />
      </section>

      <p className="text-center text-sm text-zinc-600">
        <Link
          href={leadsPath()}
          className="inline-flex min-h-11 items-center underline underline-offset-2 hover:text-zinc-900"
        >
          Înapoi la listă
        </Link>
      </p>
    </div>
  );
}
