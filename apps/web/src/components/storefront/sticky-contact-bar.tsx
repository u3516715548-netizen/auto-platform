"use client";

import type { MouseEvent } from "react";
import type { StickyContactAction } from "@/lib/storefront/sticky-contact-actions";
import { resolveLeadFormFocusTarget } from "@/lib/storefront/lead-form-ui";
import { STOREFRONT_CONTACT_ANCHOR_ID } from "@/lib/storefront/storefront-contact-links";
import { IconPhone, IconWhatsApp } from "@/components/storefront/icons";

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

const ACTION_ORDER: StickyContactAction["kind"][] = ["call", "whatsapp", "message"];

function sortActions(actions: StickyContactAction[]): StickyContactAction[] {
  return [...actions].sort(
    (a, b) => ACTION_ORDER.indexOf(a.kind) - ACTION_ORDER.indexOf(b.kind),
  );
}

/**
 * Mobile-only sticky contact actions. Catalog/detail actions are resolved server-side.
 * Detail layout: icon squares (call / WhatsApp) + wide primary Mesaj — matches storefront refs.
 */
export function StickyContactBar({ actions }: StickyContactBarProps) {
  if (actions.length === 0) return null;

  const ordered = sortActions(actions);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <nav
        aria-label="Contact rapid"
        className="pointer-events-auto border-t border-[var(--sf-border)] bg-white/95 px-3 py-2.5 shadow-[0_-8px_24px_rgba(24,24,27,0.08)] backdrop-blur-md"
      >
        <ul className="mx-auto flex max-w-6xl items-center gap-2">
          {ordered.map((action) => {
            const isPrimary = action.kind === "message";
            const isWhatsApp = action.kind === "whatsapp";

            if (isPrimary) {
              return (
                <li key={action.kind} className="min-w-0 flex-[1.4]">
                  <a
                    href={action.href}
                    className="inline-flex min-h-12 w-full items-center justify-center rounded-[var(--sf-radius)] px-4 text-sm font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-accent)]"
                    style={{ backgroundColor: "var(--sf-accent)" }}
                    aria-label={action.label}
                    onClick={scrollToContact}
                  >
                    {action.label}
                  </a>
                </li>
              );
            }

            return (
              <li key={action.kind} className="shrink-0">
                <a
                  href={action.href}
                  className="inline-flex size-12 items-center justify-center rounded-[var(--sf-radius)] text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-accent)]"
                  style={{
                    backgroundColor: isWhatsApp ? "var(--sf-success)" : "var(--sf-accent)",
                  }}
                  aria-label={action.label}
                  {...(action.external
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                >
                  {action.kind === "call" ? <IconPhone size={20} /> : <IconWhatsApp size={20} />}
                  <span className="sr-only">{action.label}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
