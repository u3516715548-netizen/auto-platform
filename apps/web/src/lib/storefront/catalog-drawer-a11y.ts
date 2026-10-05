/** Selector for focusable controls inside the catalog filter drawer. */
export const CATALOG_DRAWER_FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

/**
 * Pure focus-trap wrap: when Tab/Shift+Tab would leave the set,
 * returns the index to focus next; otherwise null (browser default).
 */
export function resolveFocusTrapIndex(
  focusedIndex: number,
  length: number,
  shiftKey: boolean,
): number | null {
  if (length <= 0) return null;
  if (shiftKey && focusedIndex <= 0) return length - 1;
  if (!shiftKey && focusedIndex >= length - 1) return 0;
  return null;
}

/** Body overflow value while the mobile filter drawer is open. */
export function catalogDrawerBodyOverflow(locked: boolean): "hidden" | "" {
  return locked ? "hidden" : "";
}
