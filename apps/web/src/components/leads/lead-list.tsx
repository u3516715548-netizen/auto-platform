import Link from "next/link";
import type { LeadListItem } from "@/lib/leads/list-leads";
import { formatLeadDateTimeRo } from "@/lib/leads/lead-list-filter";
import { leadStatusBadgeClass, leadStatusLabel } from "@/lib/leads/status-label";
import { leadDetailPath, vehicleEditPath } from "@/lib/dashboard/nav";
import { secondaryLinkClassName } from "@/lib/ui/form-styles";

type LeadListProps = {
  leads: LeadListItem[];
};

export function LeadList({ leads }: LeadListProps) {
  return (
    <>
      {/* Desktop table */}
      <div className="hidden min-w-0 overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm md:block">
        <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
          <caption className="sr-only">Lista solicitărilor primite</caption>
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs tracking-wide text-zinc-600 uppercase">
            <tr>
              <th scope="col" className="px-3 py-3 font-medium">
                Data
              </th>
              <th scope="col" className="px-3 py-3 font-medium">
                Persoană
              </th>
              <th scope="col" className="px-3 py-3 font-medium">
                Contact
              </th>
              <th scope="col" className="px-3 py-3 font-medium">
                Vehicul
              </th>
              <th scope="col" className="px-3 py-3 font-medium">
                Status
              </th>
              <th scope="col" className="px-3 py-3 font-medium">
                Atribuit
              </th>
              <th scope="col" className="px-3 py-3 font-medium">
                <span className="sr-only">Acțiuni</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} className="border-b border-zinc-100 last:border-0">
                <td className="whitespace-nowrap px-3 py-3 text-zinc-700">
                  <time dateTime={lead.createdAt.toISOString()}>
                    {formatLeadDateTimeRo(lead.createdAt)}
                  </time>
                </td>
                <td className="max-w-[10rem] px-3 py-3 font-medium break-words text-zinc-900">
                  {lead.name}
                </td>
                <td className="max-w-[12rem] px-3 py-3 break-all text-zinc-700">
                  {[lead.email, lead.phone].filter(Boolean).join(" · ") || "—"}
                </td>
                <td className="max-w-[12rem] px-3 py-3 break-words text-zinc-700">
                  {lead.vehicle ? (
                    <Link
                      href={vehicleEditPath(lead.vehicle.id)}
                      className="underline-offset-2 hover:underline"
                    >
                      {lead.vehicle.make} {lead.vehicle.model}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-3 py-3">
                  <span
                    className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${leadStatusBadgeClass(lead.status)}`}
                  >
                    {leadStatusLabel(lead.status)}
                  </span>
                </td>
                <td className="max-w-[8rem] px-3 py-3 break-words text-zinc-700">
                  {lead.assignee?.displayName ?? "Neatribuit"}
                </td>
                <td className="px-3 py-3">
                  <Link href={leadDetailPath(lead.id)} className={secondaryLinkClassName}>
                    Vezi
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="flex flex-col gap-3 md:hidden">
        {leads.map((lead) => (
          <li
            key={lead.id}
            className="min-w-0 rounded-lg border border-zinc-200 bg-white p-3 shadow-sm sm:p-4"
          >
            <div className="flex min-w-0 flex-col gap-3">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words text-base font-semibold text-zinc-900">{lead.name}</p>
                  <p className="mt-1 text-sm text-zinc-600">
                    <time dateTime={lead.createdAt.toISOString()}>
                      {formatLeadDateTimeRo(lead.createdAt)}
                    </time>
                  </p>
                </div>
                <span
                  className={`inline-flex shrink-0 items-center rounded-md px-2.5 py-1 text-xs font-medium ${leadStatusBadgeClass(lead.status)}`}
                >
                  {leadStatusLabel(lead.status)}
                </span>
              </div>
              <dl className="grid gap-2 text-sm">
                <div>
                  <dt className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
                    Contact
                  </dt>
                  <dd className="mt-0.5 break-all text-zinc-800">
                    {[lead.email, lead.phone].filter(Boolean).join(" · ") || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
                    Vehicul
                  </dt>
                  <dd className="mt-0.5 break-words text-zinc-800">
                    {lead.vehicle ? (
                      <Link
                        href={vehicleEditPath(lead.vehicle.id)}
                        className="underline-offset-2 hover:underline"
                      >
                        {lead.vehicle.make} {lead.vehicle.model}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
                    Atribuit
                  </dt>
                  <dd className="mt-0.5 text-zinc-800">
                    {lead.assignee?.displayName ?? "Neatribuit"}
                  </dd>
                </div>
              </dl>
              <Link href={leadDetailPath(lead.id)} className={`${secondaryLinkClassName} w-full`}>
                Vezi
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
