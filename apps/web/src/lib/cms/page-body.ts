/**
 * Safe display helpers for CMS body (already sanitized on write).
 */

/** Escapes HTML and preserves newlines as <br> — never injects raw HTML. */
export function renderTenantPageBodyHtml(body: string): string {
  const escaped = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
  return escaped.replace(/\n/g, "<br />");
}
