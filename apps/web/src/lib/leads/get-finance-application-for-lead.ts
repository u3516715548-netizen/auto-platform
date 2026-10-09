import { and, eq } from "drizzle-orm";
import { financeApplications, getDb, withTenantContext } from "@auto-platform/db";
import type { FinanceApplicantType, FinanceApplicationStatus } from "@auto-platform/types";
import { requireMembership } from "@/lib/auth/require-membership";

export type FinanceApplicationForLead = {
  applicantType: FinanceApplicantType;
  fullName: string;
  companyTaxId: string | null;
  email: string;
  phone: string;
  amountEur: string;
  termMonths: number;
  vehiclePriceEurSnapshot: string;
  estimatedMonthlyEurSnapshot: string;
  status: FinanceApplicationStatus;
  consentVersion: string;
  createdAt: Date;
};

/**
 * Staff-only: finance application linked to a companion lead in the active tenant.
 * Returns null when missing or cross-tenant.
 */
export async function getFinanceApplicationForLead(
  leadId: string,
): Promise<FinanceApplicationForLead | null> {
  const session = await requireMembership();
  const tenantId = session.tenant.tenantId;
  const profileId = session.user.profile.id;

  const row = await withTenantContext(getDb(), { profileId, tenantId }, async (db) => {
    const [found] = await db
      .select({
        tenantId: financeApplications.tenantId,
        applicantType: financeApplications.applicantType,
        fullName: financeApplications.fullName,
        companyTaxId: financeApplications.companyTaxId,
        email: financeApplications.email,
        phone: financeApplications.phone,
        amountEur: financeApplications.amountEur,
        termMonths: financeApplications.termMonths,
        vehiclePriceEurSnapshot: financeApplications.vehiclePriceEurSnapshot,
        estimatedMonthlyEurSnapshot: financeApplications.estimatedMonthlyEurSnapshot,
        status: financeApplications.status,
        consentVersion: financeApplications.consentVersion,
        createdAt: financeApplications.createdAt,
      })
      .from(financeApplications)
      .where(
        and(eq(financeApplications.leadId, leadId), eq(financeApplications.tenantId, tenantId)),
      )
      .limit(1);
    return found ?? null;
  });

  if (!row || row.tenantId !== tenantId) return null;

  return {
    applicantType: row.applicantType,
    fullName: row.fullName,
    companyTaxId: row.companyTaxId,
    email: row.email,
    phone: row.phone,
    amountEur: row.amountEur,
    termMonths: row.termMonths,
    vehiclePriceEurSnapshot: row.vehiclePriceEurSnapshot,
    estimatedMonthlyEurSnapshot: row.estimatedMonthlyEurSnapshot,
    status: row.status,
    consentVersion: row.consentVersion,
    createdAt: row.createdAt,
  };
}
