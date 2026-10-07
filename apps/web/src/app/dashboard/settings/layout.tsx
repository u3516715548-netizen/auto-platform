import type { ReactNode } from "react";

type SettingsLayoutProps = {
  children: ReactNode;
};

/**
 * Settings area — navigation lives in the primary dashboard sidebar.
 */
export default function DashboardSettingsLayout({ children }: SettingsLayoutProps) {
  return <div className="min-w-0">{children}</div>;
}
