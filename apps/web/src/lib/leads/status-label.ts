import type { LeadStatus } from "@auto-platform/types";

const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "Nou",
  contacted: "Contactat",
  qualified: "Calificat",
  won: "Câștigat",
  lost: "Pierdut",
  archived: "Arhivat",
};

export function leadStatusLabel(status: LeadStatus): string {
  return STATUS_LABELS[status] ?? status;
}

/** Visual + text cue — never rely on color alone. */
export function leadStatusBadgeClass(status: LeadStatus): string {
  switch (status) {
    case "new":
      return "bg-sky-100 text-sky-950 ring-1 ring-sky-300";
    case "contacted":
    case "qualified":
      return "bg-amber-100 text-amber-950 ring-1 ring-amber-300";
    case "won":
      return "bg-emerald-100 text-emerald-950 ring-1 ring-emerald-300";
    case "lost":
    case "archived":
      return "bg-zinc-100 text-zinc-800 ring-1 ring-zinc-300";
    default:
      return "bg-zinc-100 text-zinc-800 ring-1 ring-zinc-300";
  }
}

export function leadSourceLabel(source: string): string | null {
  if (source === "storefront") return "Site public";
  if (source === "finance") return "Finanțare";
  if (!source.trim()) return null;
  // Unknown sources: show only plain short tokens (no raw internals).
  if (/^[a-z0-9_-]{1,40}$/i.test(source)) return source;
  return null;
}
