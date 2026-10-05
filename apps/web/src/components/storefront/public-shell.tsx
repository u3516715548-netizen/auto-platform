import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import type { PublicTenantView } from "@/lib/storefront/resolve-public-tenant";
import {
  publicCatalogPath,
  publicComparePath,
  publicSavedPath,
} from "@/lib/storefront/paths";
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
import { StorefrontListsProvider } from "@/components/storefront/storefront-lists-context";
import { CompareFloatingBar } from "@/components/storefront/compare-floating-bar";
import {
  IconBookmark,
  IconCar,
  IconCompare,
  IconHome,
  IconPhone,
} from "@/components/storefront/icons";

type PublicStorefrontShellProps = {
  tenant: PublicTenantView;
  children: ReactNode;
  mainClassName?: string;
  stickySurface?: StickyContactSurface;
};

const focusLink =
  "rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-accent)]";

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
  const stickyActions =
    stickySurface === "detail"
      ? resolveStickyContactActions(tenant, stickySurface)
      : [];
  const showMobileNav = stickySurface === "catalog";

  const tokenStyle = {
    ["--sf-accent" as string]: accent,
  } as CSSProperties;

  return (
    <StorefrontListsProvider tenantSlug={tenant.slug}>
      <div
        className={`${shellClass} flex min-h-full min-w-0 flex-1 flex-col overflow-x-hidden`}
        data-storefront-template={tenant.templateId}
        style={tokenStyle}
      >
        <header className="sticky top-0 z-30 border-b border-[var(--sf-border)] bg-white/90 backdrop-blur-md">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-3 py-3 sm:px-6">
            <div className="flex min-w-0 items-center gap-3 sm:gap-5">
              <Link
                href={catalogHref}
                className={`min-w-0 ${focusLink}`}
                aria-label={`${tenant.name} — pagina principală`}
              >
                <span className="block truncate text-base font-semibold tracking-tight text-[var(--sf-text)] sm:text-lg">
                  {tenant.name}
                </span>
              </Link>
              <nav aria-label="Navigare catalog" className="hidden items-center gap-1 sm:flex">
                <Link
                  href={catalogHref}
                  className={`inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-[var(--sf-text)] ${focusLink}`}
                >
                  <IconCar size={16} />
                  Mașini
                </Link>
                <Link
                  href={publicSavedPath()}
                  className={`inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-[var(--sf-text)] ${focusLink}`}
                >
                  <IconBookmark size={16} />
                  Salvate
                </Link>
                <Link
                  href={publicComparePath()}
                  className={`inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-[var(--sf-text)] ${focusLink}`}
                >
                  <IconCompare size={16} />
                  Compară
                </Link>
              </nav>
            </div>

            <a
              href={headerCta.href}
              className={`inline-flex min-h-11 shrink-0 items-center justify-center rounded-full px-4 text-sm font-semibold text-white ${focusLink}`}
              style={{ backgroundColor: accent }}
              {...(headerCta.href.startsWith("http")
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
            >
              {headerCta.label}
            </a>
          </div>
        </header>

        <main
          className={`mx-auto w-full min-w-0 max-w-6xl flex-1 bg-transparent px-3 py-4 sm:px-6 sm:py-8 ${mainClassName ?? ""} ${showMobileNav ? "pb-28 md:pb-8" : ""}`}
        >
          {children}
        </main>

        <footer className="mt-auto hidden border-t border-[var(--sf-border)] bg-white/90 backdrop-blur-md md:block">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-3 py-5 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex flex-col gap-1">
              <p className="font-medium text-[var(--sf-text)]">{tenant.name}</p>
              <Link
                href={catalogHref}
                className={`w-fit text-[var(--sf-text-muted)] underline-offset-2 hover:underline ${focusLink}`}
              >
                Mașini în stoc
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

        {showMobileNav ? (
          <nav
            aria-label="Navigare mobil"
            className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--sf-border)] bg-white/95 backdrop-blur-md md:hidden"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <ul className="mx-auto flex max-w-6xl items-stretch justify-around px-1 py-1.5">
              <li className="min-w-0 flex-1">
                <Link
                  href={catalogHref}
                  className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-medium text-[var(--sf-text-muted)] ${focusLink}`}
                >
                  <span className="flex size-8 items-center justify-center" aria-hidden>
                    <IconHome size={18} />
                  </span>
                  Acasă
                </Link>
              </li>
              <li className="min-w-0 flex-1">
                <Link
                  href={catalogHref}
                  className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-semibold text-[var(--sf-text)] ${focusLink}`}
                >
                  <span
                    className="flex size-8 items-center justify-center rounded-full text-white"
                    style={{ backgroundColor: accent }}
                    aria-hidden
                  >
                    <IconCar size={16} />
                  </span>
                  Mașini
                </Link>
              </li>
              <li className="min-w-0 flex-1">
                <Link
                  href={publicSavedPath()}
                  className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-medium text-[var(--sf-text-muted)] ${focusLink}`}
                >
                  <span className="flex size-8 items-center justify-center" aria-hidden>
                    <IconBookmark size={18} />
                  </span>
                  Salvate
                </Link>
              </li>
              <li className="min-w-0 flex-1">
                <Link
                  href={publicComparePath()}
                  className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-medium text-[var(--sf-text-muted)] ${focusLink}`}
                >
                  <span className="flex size-8 items-center justify-center" aria-hidden>
                    <IconCompare size={18} />
                  </span>
                  Compară
                </Link>
              </li>
              {tenant.phone ? (
                <li className="min-w-0 flex-1">
                  <a
                    href={`tel:${tenant.phone.replace(/\s+/g, "")}`}
                    className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-medium text-[var(--sf-text-muted)] ${focusLink}`}
                  >
                    <span className="flex size-8 items-center justify-center" aria-hidden>
                      <IconPhone size={18} />
                    </span>
                    Sună
                  </a>
                </li>
              ) : null}
            </ul>
          </nav>
        ) : null}

        <CompareFloatingBar />
        <StickyContactBar actions={stickyActions} />
      </div>
    </StorefrontListsProvider>
  );
}
