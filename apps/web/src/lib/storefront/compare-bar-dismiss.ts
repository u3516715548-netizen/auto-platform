/**
 * Client-only preference: after the user dismisses the compare bar with X,
 * do not auto-show it again until compare is emptied (or storage cleared).
 */

const KEY_PREFIX = "ap.sf.compareBarDismissed.v1.";

export function compareBarDismissStorageKey(tenantSlug: string): string {
  return `${KEY_PREFIX}${tenantSlug}`;
}

export function loadCompareBarDismissed(tenantSlug: string): boolean {
  if (typeof window === "undefined" || !tenantSlug) return false;
  try {
    return window.localStorage.getItem(compareBarDismissStorageKey(tenantSlug)) === "1";
  } catch {
    return false;
  }
}

export function persistCompareBarDismissed(tenantSlug: string, dismissed: boolean): void {
  if (typeof window === "undefined" || !tenantSlug) return;
  try {
    const key = compareBarDismissStorageKey(tenantSlug);
    if (dismissed) {
      window.localStorage.setItem(key, "1");
    } else {
      window.localStorage.removeItem(key);
    }
  } catch {
    // ignore quota / private mode
  }
}

/** Pure rule for tests. */
export function shouldAutoShowCompareBar(input: {
  count: number;
  dismissed: boolean;
  forceShow?: boolean;
}): boolean {
  if (input.count <= 0) return false;
  if (input.forceShow) return true;
  if (input.dismissed) return false;
  return true;
}
