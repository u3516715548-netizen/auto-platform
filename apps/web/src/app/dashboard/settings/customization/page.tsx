import { redirect } from "next/navigation";
import { requireSettingsOwner } from "@/lib/auth/require-settings-owner";

/**
 * Personalizare entry → Teme.
 */
export default async function DashboardSettingsCustomizationPage() {
  await requireSettingsOwner();
  redirect("/dashboard/settings/customization/themes");
}
