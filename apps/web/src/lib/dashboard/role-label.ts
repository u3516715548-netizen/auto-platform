import type { MembershipRole } from "@auto-platform/core";

const ROLE_LABELS: Record<MembershipRole, string> = {
  owner: "Proprietar",
  manager: "Manager",
  sales: "Vânzări",
  viewer: "Vizualizare",
};

export function membershipRoleLabel(role: MembershipRole): string {
  return ROLE_LABELS[role] ?? role;
}
