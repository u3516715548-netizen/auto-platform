import type { LabelHTMLAttributes, ReactNode } from "react";

type LabelProps = LabelHTMLAttributes<HTMLLabelElement> & {
  children: ReactNode;
};

export function Label({ children, className = "", ...props }: LabelProps) {
  return (
    <label
      className={`block text-sm font-medium text-zinc-800 ${className}`}
      {...props}
    >
      {children}
    </label>
  );
}
