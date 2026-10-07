"use client";

import { useEffect, useState } from "react";

export const VEHICLE_DETAIL_SECTIONS = [
  { id: "vehicle-section-finance", num: "01", label: "Finanțare" },
  { id: "vehicle-section-tech", num: "02", label: "Tehnic + Dotări" },
  { id: "vehicle-section-description", num: "03", label: "Descriere" },
] as const;

/**
 * Horizontal tab bar — scrolls to in-page sections (sections stay in DOM for SEO/a11y).
 */
export function VehicleDetailSectionNav() {
  const [activeId, setActiveId] = useState<string>(VEHICLE_DETAIL_SECTIONS[0].id);

  useEffect(() => {
    const sections = VEHICLE_DETAIL_SECTIONS.map((s) => document.getElementById(s.id)).filter(
      (el): el is HTMLElement => Boolean(el),
    );
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) setActiveId(visible.target.id);
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: [0.1, 0.35, 0.6] },
    );
    for (const el of sections) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function goTo(id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    setActiveId(id);
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <nav
      aria-label="Secțiuni vehicul"
      className="sticky top-[3.25rem] z-20 -mx-1 overflow-x-auto bg-[color-mix(in_srgb,var(--sf-bg,#fff)_92%,transparent)] px-1 py-2 backdrop-blur-md [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:top-[3.75rem]"
    >
      <ul className="flex min-w-max gap-1 md:min-w-0 md:justify-stretch">
        {VEHICLE_DETAIL_SECTIONS.map((section) => {
          const active = activeId === section.id;
          return (
            <li key={section.id} className="md:min-w-0 md:flex-1">
              <button
                type="button"
                onClick={() => goTo(section.id)}
                aria-current={active ? "true" : undefined}
                className={`inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full px-3 text-sm font-semibold whitespace-nowrap transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-accent)] ${
                  active
                    ? "bg-[var(--sf-accent)] text-white"
                    : "border border-[var(--sf-border)] bg-white text-[var(--sf-text)] hover:bg-[var(--sf-surface-muted)]"
                }`}
              >
                <span className="tabular-nums opacity-90">{section.num}.</span>
                {section.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
