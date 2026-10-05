import {
  LEAD_LIST_FILTER_STATUSES,
  leadListFilterSchema,
  type LeadListFilter,
  type LeadStatus,
} from "@auto-platform/types";

export function resolveLeadListFilter(raw: string | undefined): LeadListFilter {
  const parsed = leadListFilterSchema.safeParse(raw ?? "all");
  return parsed.success ? parsed.data : "all";
}

export function leadStatusesForFilter(filter: LeadListFilter): readonly LeadStatus[] | null {
  return LEAD_LIST_FILTER_STATUSES[filter];
}

export const LEAD_LIST_FILTER_LABELS: Record<LeadListFilter, string> = {
  all: "Toate",
  new: "Noi",
  in_progress: "În lucru",
  closed: "Finalizate",
};

export function formatLeadDateTimeRo(value: Date): string {
  return new Intl.DateTimeFormat("ro-RO", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(value);
}
