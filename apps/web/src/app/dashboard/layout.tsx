import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import {
  AuthRequiredError,
  MembershipRequiredError,
  TenantResolutionError,
} from "@auto-platform/core";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireMembership } from "@/lib/auth/require-membership";
import { loginPath } from "@/lib/auth/auth-redirects";
import { countNewLeadsForTenant } from "@/lib/leads/count-new-leads";

/**
 * Server-side gate + responsive shell for /dashboard/*.
 * Verifies Auth session + tenant from Host + membership.
 * Relative redirects keep the current dealer host.
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  let session: Awaited<ReturnType<typeof requireMembership>>;

  try {
    session = await requireMembership();
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      redirect(loginPath({ auth: "required" }));
    }
    if (error instanceof TenantResolutionError) {
      redirect(loginPath({ error: "tenant" }));
    }
    if (error instanceof MembershipRequiredError) {
      redirect(loginPath({ error: "membership" }));
    }
    throw error;
  }

  const { user, tenant, membership } = session;
  let newLeadsCount = 0;
  try {
    newLeadsCount = await countNewLeadsForTenant(session);
  } catch {
    newLeadsCount = 0;
  }

  return (
    <DashboardShell
      tenantName={tenant.name}
      tenantSlug={tenant.slug}
      role={membership.role}
      userEmail={user.profile.email}
      userName={user.profile.name}
      newLeadsCount={newLeadsCount}
    >
      {children}
    </DashboardShell>
  );
}
