/**
 * Normalized contact material for cooldown cookies and dedup keys (no raw IP).
 */
export function buildLeadContactKey(email: string | undefined, phone: string | undefined): string {
  const e = email ?? "";
  const p = phone ?? "";
  return `e:${e}|p:${p}`;
}

export function normalizeLeadEmailForStorage(email: string | undefined): string {
  return (email ?? "").trim().toLowerCase();
}
