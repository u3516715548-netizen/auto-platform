import { redirect } from "next/navigation";

/**
 * Legacy settings entry → personal profile (General).
 */
export default function DashboardSettingsIndexPage() {
  redirect("/dashboard/settings/general");
}
