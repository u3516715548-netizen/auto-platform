"use client";

import type { AnchorHTMLAttributes, ReactNode } from "react";
import { emitContactClickFromHref } from "@/lib/marketing/emit-marketing-event";

type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string;
  sourceContext: string;
  children: ReactNode;
};

/** Public contact/CTA link that emits click_* events without capturing PII. */
export function TrackedContactLink({
  href,
  sourceContext,
  children,
  onClick,
  ...rest
}: Props) {
  return (
    <a
      href={href}
      {...rest}
      onClick={(event) => {
        emitContactClickFromHref(href, sourceContext);
        onClick?.(event);
      }}
    >
      {children}
    </a>
  );
}
