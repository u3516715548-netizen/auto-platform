"use client";

import type { MouseEvent } from "react";
import type { StickyContactAction } from "@/lib/storefront/sticky-contact-actions";
import { resolveLeadFormFocusTarget } from "@/lib/storefront/lead-form-ui";
import { STOREFRONT_CONTACT_ANCHOR_ID } from "@/lib/storefront/storefront-contact-links";

type StickyContactBarProps = {
  actions: StickyContactAction[];
};

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function scrollToContact(event: MouseEvent<HTMLAnchorElement>) {
  const target = document.getElementById(STOREFRONT_CONTACT_ANCHOR_ID);
  if (!target) return;
  event.preventDefault();
  target.scrollIntoView({
    behavior: prefersReducedMotion() ? "auto" : "smooth",
    block: "start",
  });
  const focusable = resolveLeadFormFocusTarget(target) ?? target;
  if (focusable === target && !target.hasAttribute("tabindex")) {
    target.tabIndex = -1;
  }
  focusable.focus({ preventScroll: true });
}

/**
 * Mobile-only sticky contact actions. Catalog/detail actions are resolved server-side.
 */
export function StickyContactBar({ actions }: StickyContactBarProps) {
  if (actions.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <nav
        aria-label="Contact rapid"
        className="pointer-events-auto border-t border-[var(--sf-border)] bg-[var(--sf-surface)]/95 px-3 py-2 shadow-[0_-8px_24px_rgba(24,24,27,0.08)] backdrop-blur-sm"
      >
        <ul className="mx-auto flex max-w-6xl gap-2">
          {actions.map((action) => {
            const isPrimary = action.kind === "message" || action.kind === "call";
            const className = isPrimary
              ? "inline-flex min-h-11 flex-1 items-center justify-center rounded-[var(--sf-radius)] px-3 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-accent)]"
              : "inline-flex min-h-11 flex-1 items-center justify-center rounded-[var(--sf-radius)] border border-[var(--sf-border)] bg-[var(--sf-surface)] px-3 text-sm font-semibold text-[var(--sf-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-accent)]";

            return (
              <li key={action.kind} className="min-w-0 flex-1">
                <a
                  href={action.href}
                  className={className}
                  style={isPrimary ? { backgroundColor: "var(--sf-accent)" } : undefined}
                  aria-label={action.label}
                  onClick={action.kind === "message" ? scrollToContact : undefined}
                  {...(action.external
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                >
                  {action.label}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
