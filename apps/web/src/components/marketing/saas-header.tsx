"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import {
  COMMERCIAL_ENTERPRISE_CONTACT_HREF,
  commercialRegisterMailtoHref,
} from "@/lib/marketing/commercial-plans";

const LOGO_WIDTH = 1024;
const LOGO_HEIGHT = 146;

type NavItem =
  | { kind: "link"; href: string; label: string }
  | { kind: "external"; href: string; label: string };

/** Shopify-style list — auth CTAs live in the footer of the panel. */
const MOBILE_ITEMS: readonly NavItem[] = [
  { kind: "link", href: "/#de-ce", label: "De ce Autobear" },
  { kind: "link", href: "/preturi", label: "Prețuri" },
  { kind: "external", href: COMMERCIAL_ENTERPRISE_CONTACT_HREF, label: "Enterprise" },
] as const;

type SaasHeaderProps = {
  /** Overlay transparent chrome — homepage hero only. */
  transparent?: boolean;
};

/**
 * Apex marketing header — desktop nav + mobile fullscreen menu.
 */
export function SaasHeader({ transparent = false }: SaasHeaderProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const registerHref = commercialRegisterMailtoHref();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const chromeClass = open
    ? "saas-header-menu-open bg-black"
    : transparent
      ? "saas-header-transparent"
      : "border-b border-white/8 bg-black/70 backdrop-blur-xl";

  return (
    <header
      className={`saas-header z-40 ${transparent && !open ? "saas-header-overlay" : "relative"} ${chromeClass}`}
    >
      <div className="relative z-[70] mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6 sm:py-3.5">
        <Link
          href="/"
          className="saas-header-brand inline-flex shrink-0 items-center"
          aria-label="Autobear — acasă"
          onClick={() => setOpen(false)}
        >
          <Image
            src="/brand/autobear-logo-white.png"
            alt="Autobear"
            width={LOGO_WIDTH}
            height={LOGO_HEIGHT}
            className="saas-logo"
            sizes="(max-width: 640px) 33vw, 224px"
            priority
          />
        </Link>

        {/* Desktop */}
        <nav
          className="ml-auto hidden items-center gap-1 md:flex md:gap-2"
          aria-label="Navigare platformă"
        >
          <Link href="/#de-ce" className="saas-nav-link">
            De ce Autobear
          </Link>
          <Link href="/preturi" className="saas-nav-link">
            Prețuri
          </Link>
          <a href={COMMERCIAL_ENTERPRISE_CONTACT_HREF} className="saas-nav-link">
            Enterprise
          </a>
          <Link href="/login" className="saas-btn-primary !min-h-10 !px-4 !py-2 !text-[0.7rem]">
            Autentificare
          </Link>
        </nav>

        {/* Mobile: auth text + hamburger */}
        <div className="ml-auto flex items-center gap-2 md:hidden">
          <Link href="/login" className="saas-header-auth-text">
            Autentificare
          </Link>
          <button
            type="button"
            className="saas-hamburger"
            aria-expanded={open}
            aria-controls={panelId}
            aria-label={open ? "Închide meniul" : "Deschide meniul"}
            onClick={() => setOpen((v) => !v)}
          >
            <span className={`saas-hamburger-line ${open ? "is-open-1" : ""}`} />
            <span className={`saas-hamburger-line ${open ? "is-open-2" : ""}`} />
            <span className={`saas-hamburger-line ${open ? "is-open-3" : ""}`} />
          </button>
        </div>
      </div>

      <div
        id={panelId}
        className={`saas-mobile-menu ${open ? "is-open" : ""}`}
        aria-hidden={!open}
      >
        <nav
          className="saas-mobile-menu-panel"
          aria-label="Meniu mobil"
          inert={!open ? true : undefined}
        >
          <ul className="saas-mobile-menu-list">
            {MOBILE_ITEMS.map((item) => (
              <li key={item.label}>
                {item.kind === "link" ? (
                  <Link
                    href={item.href}
                    className="saas-mobile-menu-link"
                    onClick={() => setOpen(false)}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <a
                    href={item.href}
                    className="saas-mobile-menu-link"
                    onClick={() => setOpen(false)}
                  >
                    {item.label}
                  </a>
                )}
              </li>
            ))}
          </ul>

          <div className="saas-mobile-menu-actions">
            <Link
              href="/login"
              className="saas-mobile-menu-login"
              onClick={() => setOpen(false)}
            >
              Intră în cont
            </Link>
            <a
              href={registerHref}
              className="saas-mobile-menu-register"
              onClick={() => setOpen(false)}
            >
              Înregistrare
            </a>
          </div>
        </nav>
      </div>
    </header>
  );
}
