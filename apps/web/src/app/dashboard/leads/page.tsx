import Link from "next/link";
import { requireMembership } from "@/lib/auth/require-membership";
import { leadsPath } from "@/lib/dashboard/nav";
import {
  LEAD_LIST_FILTER_LABELS,
  resolveLeadListFilter,
} from "@/lib/leads/lead-list-filter";
import { listTenantLeads } from "@/lib/leads/list-leads";
import { LeadList } from "@/components/leads/lead-list";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import type { LeadListFilter } from "@auto-platform/types";

type PageProps = {
  searchParams: Promise<{ filter?: string }>;
};

const FILTERS: LeadListFilter[] = ["all", "new", "in_progress", "closed"];

/**
 * Tenant lead inbox (10B). Isolated by Host membership.
 */
export default async function DashboardLeadsPage({ searchParams }: PageProps) {
  await requireMembership();
  const params = await searchParams;
  const filter = resolveLeadListFilter(params.filter);

  let leads: Awaited<ReturnType<typeof listTenantLeads>> = [];
  let listError: string | null = null;
  try {
    leads = await listTenantLeads(filter);
  } catch {
    leads = [];
    listError = "Nu am putut încărca solicitările. Reîncarcă pagina sau încearcă mai târziu.";
  }

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <header className="flex min-w-0 flex-col gap-2">
        <p className="text-sm font-medium tracking-wide text-teal-800 uppercase">Lead-uri</p>
        <h2 className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">
          Solicitări primite
        </h2>
        <p className="max-w-2xl text-sm leading-6 text-zinc-600">
          Mesajele de pe site-ul public pentru dealerul curent. Datele de contact rămân doar în
          dashboard.
        </p>
      </header>

      <nav
        className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Filtru status lead-uri"
      >
        {FILTERS.map((value) => {
          const href = value === "all" ? leadsPath() : leadsPath({ filter: value });
          const selected = filter === value;
          return (
            <Link
              key={value}
              href={href}
              aria-current={selected ? "page" : undefined}
              className={`inline-flex min-h-11 shrink-0 items-center rounded-md px-3.5 text-sm font-medium transition-colors ${
                selected
                  ? "bg-teal-800 text-white"
                  : "bg-white text-zinc-800 ring-1 ring-zinc-300 hover:bg-zinc-50"
              }`}
            >
              {LEAD_LIST_FILTER_LABELS[value]}
            </Link>
          );
        })}
      </nav>

      {listError ? <FeedbackBanner variant="error">{listError}</FeedbackBanner> : null}

      {!listError && leads.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-white px-4 py-10 text-center">
          <p className="text-base font-medium text-zinc-900">Nu ai primit încă solicitări.</p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-zinc-600">
            Când un vizitator trimite formularul de pe pagina unui vehicul disponibil, apar aici.
          </p>
        </div>
      ) : null}

      {!listError && leads.length > 0 ? <LeadList leads={leads} /> : null}
    </div>
  );
}
