import Link from "next/link";
import type { SeoHealthReport, SeoHealthSeverity } from "@/lib/seo/health/types";

function severityClass(severity: SeoHealthSeverity): string {
  if (severity === "critical") return "bg-red-50 text-red-800 ring-red-200";
  if (severity === "warning") return "bg-amber-50 text-amber-900 ring-amber-200";
  if (severity === "info") return "bg-sky-50 text-sky-900 ring-sky-200";
  return "bg-emerald-50 text-emerald-800 ring-emerald-200";
}

function severityLabel(severity: SeoHealthSeverity): string {
  if (severity === "critical") return "Critical";
  if (severity === "warning") return "Warning";
  if (severity === "info") return "Info";
  return "Passed";
}

type Props = {
  report: SeoHealthReport;
};

/**
 * Owner-only SEO health presentation — issues first, then passed.
 * Score is internal Autobear health, not a Google metric.
 */
export function SeoHealthReportView({ report }: Props) {
  const actionable = report.issues.filter((i) => i.severity === "critical" || i.severity === "warning");
  const rest = report.issues.filter((i) => i.severity === "info" || i.severity === "passed");

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-lg border border-zinc-200 bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-zinc-900">Sumar</h3>
            <p className="mt-1 text-sm text-zinc-600">
              {report.tenantName} · generat {new Date(report.generatedAt).toLocaleString("ro-RO")}
            </p>
          </div>
          <p className="text-sm text-zinc-600">
            Scor intern Autobear:{" "}
            <span className="font-semibold text-zinc-900">{report.summary.internalScore}/100</span>
            <span className="block text-xs text-zinc-500">Nu este un scor Google.</span>
          </p>
        </div>
        <ul className="mt-4 flex flex-wrap gap-2 text-sm">
          <li className={`rounded-full px-3 py-1 ring-1 ring-inset ${severityClass("critical")}`}>
            {report.summary.critical} Critical
          </li>
          <li className={`rounded-full px-3 py-1 ring-1 ring-inset ${severityClass("warning")}`}>
            {report.summary.warning} Warnings
          </li>
          <li className={`rounded-full px-3 py-1 ring-1 ring-inset ${severityClass("passed")}`}>
            {report.summary.passed} Passed
          </li>
          <li className={`rounded-full px-3 py-1 ring-1 ring-inset ${severityClass("info")}`}>
            {report.summary.info} Info
          </li>
        </ul>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-zinc-500">
          {report.methodNotes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-base font-semibold text-zinc-900">Probleme de rezolvat</h3>
        {actionable.length === 0 ? (
          <p className="text-sm text-zinc-600">Nicio problemă critical/warning — bine!</p>
        ) : (
          <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
            {actionable.map((issue) => (
              <li key={`${issue.id}:${issue.path ?? ""}:${issue.title}`} className="px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${severityClass(issue.severity)}`}
                    >
                      {severityLabel(issue.severity)}
                    </span>
                    <p className="mt-1 font-medium text-zinc-900">{issue.title}</p>
                    <p className="mt-0.5 text-sm text-zinc-600">{issue.detail}</p>
                    {issue.path ? (
                      <p className="mt-1 text-xs text-zinc-500">Path: {issue.path}</p>
                    ) : null}
                  </div>
                  {issue.href ? (
                    <Link
                      href={issue.href}
                      className="shrink-0 text-sm font-medium text-teal-800 underline-offset-2 hover:underline"
                    >
                      Deschide
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-base font-semibold text-zinc-900">Passed / Info</h3>
        <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white">
          {rest.map((issue) => (
            <li key={`${issue.id}:${issue.path ?? ""}:${issue.title}`} className="px-4 py-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${severityClass(issue.severity)}`}
                >
                  {severityLabel(issue.severity)}
                </span>
                <p className="text-sm text-zinc-800">{issue.title}</p>
              </div>
              <p className="mt-0.5 text-xs text-zinc-500">{issue.detail}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
