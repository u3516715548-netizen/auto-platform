import { loginPath } from "@/lib/auth/auth-redirects";

/**
 * Relative invite accept path — preserves Host (acme/beta).
 * Token is path-bound for the accept UI; never log it.
 */
export function inviteAcceptPath(token: string): string {
  return `/invite/${encodeURIComponent(token)}`;
}

/** Login URL that returns to the accept page after auth (token stays in path). */
export function loginPathForInviteAccept(token: string): string {
  return loginPath({ next: inviteAcceptPath(token) });
}

/** Safe relative `next` for post-login — only same-origin relative invite paths. */
export function sanitizeInviteNextPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/invite/")) return null;
  if (trimmed.includes("://") || trimmed.includes("//") || trimmed.includes("\\")) {
    return null;
  }
  // /invite/<64 hex>
  if (!/^\/invite\/[a-f0-9]{64}$/i.test(trimmed)) return null;
  return trimmed;
}
