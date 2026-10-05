import type { ReactNode } from "react";

type FeedbackBannerProps = {
  variant: "success" | "error" | "info";
  children: ReactNode;
};

const variantClass: Record<FeedbackBannerProps["variant"], string> = {
  success: "border-teal-200 bg-teal-50 text-teal-950",
  error: "border-red-200 bg-red-50 text-red-900",
  info: "border-zinc-200 bg-zinc-50 text-zinc-800",
};

/**
 * Shared success / error / info banner for dashboard forms and lists (4E).
 */
export function FeedbackBanner({ variant, children }: FeedbackBannerProps) {
  const role = variant === "error" ? "alert" : "status";
  return (
    <p
      className={`rounded-md border px-3 py-2.5 text-sm leading-6 ${variantClass[variant]}`}
      role={role}
    >
      {children}
    </p>
  );
}
