import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import type { PublicTenantView } from "@/lib/storefront/resolve-public-tenant";
import { publicCatalogPath } from "@/lib/storefront/paths";
import {
  resolveStorefrontHeaderCta,
  resolveStorefrontShellClass,
  storefrontFooterContactLinks,
} from "@/lib/storefront/storefront-shell-helpers";
import {
  resolveStickyContactActions,
  type StickyContactSurface,
} from "@/lib/storefront/sticky-contact-actions";
import { StickyContactBar } from "@/components/storefront/sticky-contact-bar";

type PublicStorefrontShellProps = {
  tenant: PublicTenantView;
  children: ReactNode;
  mainClassName?: string;
  stickySurface?: StickyContactSurface;
};

const focusLink =
  "rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-accent)]";

export function PublicStorefrontShell({
  tenant,
  children,
  mainClassName,
  stickySurface,
}: PublicStorefrontShellProps) {
  const accent = tenant.primaryColor;
  const catalogHref = publicCatalogPath();
  const shellClass = resolveStorefrontShellClass(tenant.templateId);
  const headerCta = resolveStorefrontHeaderCta(tenant);
  const footerContacts = storefrontFooterContactLinks(tenant);
  const stickyActions = stickySurface
    ? resolveStickyContactActions(tenant, stickySurface)
    : [];

  const tokenStyle = {
    ["--sf-accent" as string]: accent,
  } as CSSProperties;

  return (
    <div
      className={`${shellClass} flex min-h-full min-w-0 flex-1 flex-col overflow-x-hidden`}
      data-storefront-template={tenant.templateId}
      style={tokenStyle}
    >
      <header className="sticky top-0 z-30 border-b border-[var(--sf-border)] bg-[var(--sf-surface)]/95 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-3 py-3 sm:px-6 sm:py-3.5">
          <div className="flex min-w-0 items-center gap-4 sm:gap-6">
            <Link
              href={catalogHref}
              className={`min-w-0 ${focusLink}`}
              aria-label={`${tenant.name} — pagina principală`}
            >
              <span className="block truncate text-base font-semibold tracking-tight text-[var(--sf-text)] sm:text-lg">
                {tenant.name}
              </span>
            </Link>
            <nav aria-label="Navigare catalog" className="hidden sm:block">
              <Link
                href={catalogHref}
                className={`inline-flex min-h-11 items-center px-2 text-sm font-medium text-[var(--sf-text-muted)] transition-colors hover:text-[var(--sf-text)] ${focusLink}`}
              >
                Stoc
              </Link>
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              href={catalogHref}
              className={`inline-flex min-h-11 items-center px-2 text-sm font-medium text-[var(--sf-text-muted)] sm:hidden ${focusLink}`}
            >
              Stoc
            </Link>
            <a
              href={headerCta.href}
              className={`inline-flex min-h-11 items-center justify-center rounded-[var(--sf-radius)] px-3.5 text-sm font-semibold text-white shadow-sm transition-[filter] hover:brightness-95 ${focusLink}`}
              style={{ backgroundColor: accent }}
              {...(headerCta.href.startsWith("http")
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
            >
              {headerCta.label}
            </a>
          </div>
        </div>
      </header>

      <main
        className={`mx-auto w-full min-w-0 max-w-6xl flex-1 px-3 py-5 sm:px-6 sm:py-8 ${mainClassName ?? ""}`}
      >
        {children}
      </main>

      <footer className="mt-auto border-t border-[var(--sf-border)] bg-[var(--sf-surface)]">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-3 py-5 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex flex-col gap-1">
            <p className="font-medium text-[var(--sf-text)]">{tenant.name}</p>
            <Link
              href={catalogHref}
              className={`w-fit text-[var(--sf-text-muted)] underline-offset-2 hover:underline ${focusLink}`}
            >
              Stoc
            </Link>
          </div>
          {footerContacts.length > 0 ? (
            <ul className="flex flex-wrap gap-x-4 gap-y-2 text-[var(--sf-text-muted)]">
              {footerContacts.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className={`inline-flex min-h-11 items-center ${focusLink}`}
                    {...(link.external
                      ? { target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </footer>

      <StickyContactBar actions={stickyActions} />
    </div>
  );
}
