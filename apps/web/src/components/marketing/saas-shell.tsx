import Image from "next/image";
import Link from "next/link";
import { Space_Grotesk, DM_Sans } from "next/font/google";
import type { ReactNode } from "react";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-saas-display",
  weight: ["500", "600", "700"],
});

const body = DM_Sans({
  subsets: ["latin"],
  variable: "--font-saas-body",
  weight: ["400", "500", "600", "700"],
});

type SaasShellProps = {
  children: ReactNode;
};

/**
 * Apex-only commercial chrome (Etapa 26A+ Autobear neon).
 * Not used on tenant storefront hosts.
 */
export function SaasShell({ children }: SaasShellProps) {
  return (
    <div
      className={`${display.variable} ${body.variable} saas-marketing flex min-h-full flex-1 flex-col`}
      style={{ fontFamily: "var(--font-saas-body), ui-sans-serif, system-ui, sans-serif" }}
    >
      <header className="relative z-20 border-b border-white/8 bg-black/70 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <Link href="/" className="group inline-flex items-center gap-3" aria-label="Autobear — acasă">
            <Image
              src="/brand/autobear-logo-white.png"
              alt="Autobear"
              width={168}
              height={36}
              className="h-7 w-auto sm:h-8"
              priority
            />
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2" aria-label="Navigare platformă">
            <Link
              href="/preturi"
              className="rounded-full px-3 py-2 text-[0.7rem] font-semibold tracking-[0.14em] text-white/70 uppercase transition hover:bg-white/5 hover:text-white sm:px-4"
            >
              Prețuri
            </Link>
            <Link href="/login" className="saas-btn-primary !min-h-10 !px-4 !py-2 !text-[0.7rem]">
              Autentificare
            </Link>
          </nav>
        </div>
      </header>
      <div className="relative flex flex-1 flex-col">{children}</div>
      <footer className="border-t border-white/8 bg-black px-4 py-10 text-sm text-white/45 sm:px-6">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Image
            src="/brand/autobear-logo-white.png"
            alt="Autobear"
            width={140}
            height={30}
            className="h-6 w-auto opacity-90"
          />
          <p className="max-w-md leading-6">
            Storefrontul dealerului rămâne pe subdomeniu — nu pe această pagină.
          </p>
        </div>
      </footer>
    </div>
  );
}
