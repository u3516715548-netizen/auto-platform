import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
};

const variantClass: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-zinc-900 text-white hover:bg-zinc-800 focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2 disabled:bg-zinc-400",
  secondary:
    "border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2 disabled:text-zinc-400",
  ghost:
    "text-zinc-700 hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2 disabled:text-zinc-400",
};

export function Button({
  children,
  className = "",
  variant = "primary",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-11 items-center justify-center rounded-md px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed ${variantClass[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
