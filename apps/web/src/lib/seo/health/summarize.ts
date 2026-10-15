import type { SeoHealthIssue, SeoHealthSummary } from "@/lib/seo/health/types";

/**
 * Internal score 0–100 — Autobear health only, not a Google metric.
 * Critical hurts most; warnings less; passed boosts toward 100.
 */
export function summarizeSeoHealth(issues: SeoHealthIssue[]): SeoHealthSummary {
  let critical = 0;
  let warning = 0;
  let passed = 0;
  let info = 0;
  for (const issue of issues) {
    if (issue.severity === "critical") critical += 1;
    else if (issue.severity === "warning") warning += 1;
    else if (issue.severity === "passed") passed += 1;
    else info += 1;
  }

  const total = Math.max(1, critical + warning + passed);
  const raw = ((passed * 1 + info * 0.5 - critical * 3 - warning * 1) / total) * 100 + 50;
  const internalScore = Math.max(0, Math.min(100, Math.round(raw)));

  return { critical, warning, passed, info, internalScore };
}

export function sortSeoHealthIssues(issues: SeoHealthIssue[]): SeoHealthIssue[] {
  const rank: Record<string, number> = { critical: 0, warning: 1, info: 2, passed: 3 };
  return [...issues].sort((a, b) => {
    const d = (rank[a.severity] ?? 9) - (rank[b.severity] ?? 9);
    if (d !== 0) return d;
    return a.id.localeCompare(b.id);
  });
}
