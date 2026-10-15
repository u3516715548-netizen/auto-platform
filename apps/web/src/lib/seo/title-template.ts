/**
 * Applies a dealer title template.
 * - `%s` → page title
 * - `{dealer}` → dealer display name
 * Falls back to `pageTitle | dealerName` when template is missing/invalid.
 */
export function applySeoTitleTemplate(
  pageTitle: string,
  dealerName: string,
  template?: string | null,
): string {
  const page = pageTitle.trim();
  const dealer = dealerName.trim() || "Showroom";
  if (!page) return dealer;

  const raw = template?.trim();
  if (!raw || !raw.includes("%s")) {
    return `${page} | ${dealer}`;
  }

  return raw.replaceAll("{dealer}", dealer).replace("%s", page);
}
