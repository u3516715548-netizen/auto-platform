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
  storefrontFooterAddressLine,
  storefrontFooterContactLinks,
  storefrontFooterLegalLine,
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

/**
 * Full-width on mobile; ~1200px white storefront on desktop over a discreet outer bg.
 */
const APP_FRAME =
  "sf-canvas mx-auto flex w-full max-w-[1200px] flex-1 flex-col md:shadow-[0_0_0_1px_rgba(24,24,27,0.06)]";

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
  const footerAddress = storefrontFooterAddressLine(tenant.company);
  const footerLegal = storefrontFooterLegalLine(tenant.company);
  const stickyActions =
    stickySurface === "detail"
      ? resolveStickyContactActions(tenant, stickySurface)
      : [];
  const showMobileNav = stickySurface === "catalog";
  const mobilePhone = tenant.phone ?? tenant.company?.publicPhone;

  const tokenStyle = {
    ["--sf-accent" as string]: accent,
  } as CSSProperties;

  return (
    <StorefrontListsProvider tenantSlug={tenant.slug}>
      <div
        className={`${shellClass} flex min-h-full min-w-0 flex-1 flex-col overflow-x-clip`}
        data-storefront-template={tenant.templateId}
        style={tokenStyle}
      >
        <div className={`${APP_FRAME} min-h-full`}>
          <header className="sticky top-0 z-30 border-b border-[var(--sf-border)] bg-white/90 backdrop-blur-md">
            <div className="flex items-center justify-between gap-3 px-3 py-2.5 md:px-8 md:py-3 lg:px-10">
              <div className="flex min-w-0 items-center gap-3 md:gap-5">
                <Link
                  href={catalogHref}
                  prefetch={false}
                  className={`min-w-0 ${focusLink}`}
                  aria-label={`${tenant.name} — pagina principală`}
                >
                  <span className="block truncate text-base font-semibold tracking-tight text-[var(--sf-text)] md:text-lg">
                    {tenant.name}
                  </span>
                </Link>
                <nav
                  aria-label="Navigare catalog"
                  className="hidden items-center gap-1 md:flex"
                >
                  <Link
                    href={catalogHref}
                    prefetch={false}
                    className={`inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-[var(--sf-text)] ${focusLink}`}
                  >
                    <IconCar size={16} />
                    Mașini
                  </Link>
                  <Link
                    href={publicSavedPath()}
                    prefetch={false}
                    className={`inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-[var(--sf-text)] ${focusLink}`}
                  >
                    <IconBookmark size={16} />
                    Salvate
                  </Link>
                  <Link
                    href={publicComparePath()}
                    prefetch={false}
                    className={`inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-[var(--sf-text)] ${focusLink}`}
                  >
                    <IconCompare size={16} />
                    Compară
                  </Link>
                </nav>
              </div>

              <a
                href={headerCta.href}
                className={`inline-flex min-h-9 shrink-0 items-center justify-center rounded-full px-3.5 text-sm font-semibold text-white md:min-h-10 md:px-4 ${focusLink}`}
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
            className={`w-full min-w-0 flex-1 bg-transparent px-3 py-3 md:px-8 md:py-6 lg:px-10 ${mainClassName ?? ""} ${showMobileNav ? "pb-28 md:pb-8" : ""}`}
          >
            {children}
          </main>

          <footer className="mt-auto hidden border-t border-[var(--sf-border)] bg-white/90 backdrop-blur-md md:block">
            <div className="flex flex-col gap-3 px-8 py-5 text-sm lg:flex-row lg:items-center lg:justify-between lg:px-10">
              <div className="flex flex-col gap-1">
                <p className="font-medium text-[var(--sf-text)]">{tenant.name}</p>
                {footerAddress ? (
                  <p className="text-[var(--sf-text-muted)]">{footerAddress}</p>
                ) : null}
                {footerLegal ? (
                  <p className="text-xs text-[var(--sf-text-muted)]">{footerLegal}</p>
                ) : null}
                <Link
                  href={catalogHref}
                  prefetch={false}
                  className={`w-fit text-[var(--sf-text-muted)] underline-offset-2 hover:underline ${focusLink}`}
                >
                  Mașini în stoc
                </Link>
              </div>
              {footerContacts.length > 0 ? (
                <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[var(--sf-text-muted)]">
                  {footerContacts.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className={`inline-flex min-h-10 items-center ${focusLink}`}
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
        </div>

        {showMobileNav ? (
          <nav
            aria-label="Navigare mobil"
            className="fixed inset-x-0 bottom-0 z-[90] border-t border-[var(--sf-border)] bg-white/95 backdrop-blur-md md:hidden"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <ul className="mx-auto flex w-full max-w-[1200px] items-stretch justify-around px-1 py-1.5">
              <li className="min-w-0 flex-1">
                <Link
                  href={catalogHref}
                  prefetch={false}
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
                  prefetch={false}
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
                  prefetch={false}
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
                  prefetch={false}
                  className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-medium text-[var(--sf-text-muted)] ${focusLink}`}
                >
                  <span className="flex size-8 items-center justify-center" aria-hidden>
                    <IconCompare size={18} />
                  </span>
                  Compară
                </Link>
              </li>
              {mobilePhone ? (
                <li className="min-w-0 flex-1">
                  <a
                    href={`tel:${mobilePhone.replace(/\s+/g, "")}`}
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
