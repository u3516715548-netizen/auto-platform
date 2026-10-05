export type NewLeadsBadgeView = {
  visible: boolean;
  display: string;
  ariaLabel: string;
};

/** Pure badge formatting — safe for client components (no DB imports). */
export function formatNewLeadsBadge(countValue: number): NewLeadsBadgeView {
  if (!Number.isFinite(countValue) || countValue <= 0) {
    return { visible: false, display: "", ariaLabel: "" };
  }
  const display = countValue > 99 ? "99+" : String(Math.trunc(countValue));
  const ariaLabel =
    countValue === 1
      ? "1 lead nou"
      : countValue > 99
        ? "99+ lead-uri noi"
        : `${display} lead-uri noi`;
  return { visible: true, display, ariaLabel };
}
