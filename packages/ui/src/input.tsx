import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className = "", type = "text", ...props }: InputProps) {
  return (
    <input
      type={type}
      className={`min-h-11 w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-base text-zinc-900 outline-none transition-colors placeholder:text-zinc-500 focus:border-teal-700 focus:ring-2 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400 ${className}`}
      {...props}
    />
  );
}
