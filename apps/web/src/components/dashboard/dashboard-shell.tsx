import type { ReactNode } from "react";
import type { MembershipRole } from "@auto-platform/core";
import { LogoutButton } from "@/components/auth/logout-button";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { membershipRoleLabel } from "@/lib/dashboard/role-label";

type DashboardShellProps = {
  tenantName: string;
  tenantSlug: string;
  role: MembershipRole;
  userEmail: string;
  userName: string;
  newLeadsCount?: number;
  children: ReactNode;
};

/**
 * Responsive dealer dashboard chrome (4B).
 * All links stay relative — Host (acme/beta) is never rewritten to apex.
 */
export function DashboardShell({
  tenantName,
  tenantSlug,
  role,
  userEmail,
  userName,
  newLeadsCount = 0,
  children,
}: DashboardShellProps) {
  const roleLabel = membershipRoleLabel(role);

  return (
    <div className="flex min-h-full min-w-0 flex-1 flex-col overflow-x-hidden bg-zinc-50 md:flex-row">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-zinc-200 bg-white md:flex lg:w-64">
        <div className="flex flex-col gap-1 border-b border-zinc-200 px-4 py-5">
          <p className="text-xs font-medium tracking-wide text-teal-800 uppercase">Auto Platform</p>
          <p className="truncate text-base font-semibold tracking-tight text-zinc-900">{tenantName}</p>
          <p className="font-mono text-xs text-zinc-500">{tenantSlug}</p>
        </div>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-3 py-4">
          <DashboardNav orientation="vertical" role={role} newLeadsCount={newLeadsCount} />
        </div>
        <div className="mt-auto border-t border-zinc-200 px-4 py-4">
          <p className="truncate text-sm font-medium text-zinc-900">{userName}</p>
          <p className="mt-0.5 truncate text-xs text-zinc-500">{userEmail}</p>
          <p className="mt-2 inline-flex rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-800">
            {roleLabel}
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/95 backdrop-blur-sm">
          <div className="flex items-start justify-between gap-2 px-3 py-3 sm:gap-3 sm:px-6">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium tracking-wide text-teal-800 uppercase md:hidden">
                Auto Platform
              </p>
              <h1 className="truncate text-lg font-semibold tracking-tight text-zinc-900 sm:text-xl">
                {tenantName}
              </h1>
              <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-600 sm:text-sm">
                <span className="font-mono">{tenantSlug}</span>
                <span className="text-zinc-300" aria-hidden>
                  ·
                </span>
                <span className="rounded-md bg-zinc-100 px-2 py-0.5 font-medium text-zinc-800">
                  {roleLabel}
                </span>
                <span className="hidden text-zinc-300 sm:inline" aria-hidden>
                  ·
                </span>
                <span className="hidden max-w-[12rem] truncate sm:inline md:hidden">{userEmail}</span>
              </div>
            </div>
            <div className="shrink-0">
              <LogoutButton className="w-auto px-3 sm:px-4" />
            </div>
          </div>

          <div className="border-t border-zinc-100 px-3 py-2 sm:px-6 md:hidden">
            <DashboardNav orientation="horizontal" role={role} newLeadsCount={newLeadsCount} />
          </div>
        </header>

        <main className="w-full min-w-0 max-w-5xl flex-1 px-3 py-5 sm:px-6 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
