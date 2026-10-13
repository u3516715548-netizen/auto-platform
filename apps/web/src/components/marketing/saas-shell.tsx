import Image from "next/image";
import { Space_Grotesk, DM_Sans } from "next/font/google";
import type { ReactNode } from "react";
import { SaasHeader } from "@/components/marketing/saas-header";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-saas-display",
  weight: ["400", "500", "600", "700"],
});

const body = DM_Sans({
  subsets: ["latin"],
  variable: "--font-saas-body",
  weight: ["400", "500", "600", "700"],
});

/** Intrinsic PNG size — 1024×146 (~7.01:1). Do not invent a shorter box. */
const LOGO_WIDTH = 1024;
const LOGO_HEIGHT = 146;

type SaasShellProps = {
  children: ReactNode;
  /** Homepage: transparent overlay header over the hero (Shopify-style). */
  transparentHeader?: boolean;
};

/**
 * Apex-only commercial chrome (Etapa 26A+ Autobear neon).
 * Not used on tenant storefront hosts.
 */
export function SaasShell({ children, transparentHeader = false }: SaasShellProps) {
  return (
    <div
      className={`${display.variable} ${body.variable} saas-marketing flex min-h-full flex-1 flex-col${
        transparentHeader ? " saas-marketing-home" : ""
      }`}
      style={{ fontFamily: "var(--font-saas-body), ui-sans-serif, system-ui, sans-serif" }}
    >
      <SaasHeader transparent={transparentHeader} />
      <div className="relative flex flex-1 flex-col">{children}</div>
      <footer className="border-t border-white/8 bg-black px-4 py-10 text-sm text-white/45 sm:px-6">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Image
            src="/brand/autobear-logo-white.png"
            alt="Autobear"
            width={LOGO_WIDTH}
            height={LOGO_HEIGHT}
            className="saas-logo-footer opacity-90"
            sizes="168px"
          />
          <p className="max-w-md leading-6">
            Site-ul showroom-ului e pe adresa dealerului, nu pe această pagină.
          </p>
        </div>
      </footer>
    </div>
  );
}
