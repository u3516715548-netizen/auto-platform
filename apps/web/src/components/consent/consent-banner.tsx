"use client";

import { startTransition, useEffect, useId, useState } from "react";
import Link from "next/link";
import type { ConsentState } from "@auto-platform/types";
import {
  acceptAllConsent,
  DEFAULT_CONSENT_STATE,
  readConsentFromDocumentCookie,
  rejectAllConsent,
  writeConsentDocumentCookie,
} from "@/lib/consent/consent-state";

export type ConsentBannerProps = {
  onConsentChange: (state: ConsentState) => void;
  /**
   * Cookie parsed on the server (Host-only). Drives SSR HTML so the banner
   * copy is present without a second React tree node — never DOM-remove SSR siblings.
   */
  initialConsent?: ConsentState | null;
  /** Soft links — pages may 404 if dealer has not published CMS legal pages. */
  privacyHref?: string;
  cookiesHref?: string;
};

export function ConsentBanner({
  onConsentChange,
  initialConsent = null,
  privacyHref = "/p/confidentialitate",
  cookiesHref = "/p/cookies",
}: ConsentBannerProps) {
  const titleId = useId();
  const [open, setOpen] = useState(() => !initialConsent);
  const [customize, setCustomize] = useState(false);
  const [draft, setDraft] = useState<ConsentState>(
    () => initialConsent ?? DEFAULT_CONSENT_STATE,
  );

  useEffect(() => {
    // Client cookie is authoritative after hydrate (may differ from SSR jar).
    const existing = readConsentFromDocumentCookie() ?? initialConsent;
    startTransition(() => {
      if (existing) {
        setDraft(existing);
        setOpen(false);
      } else {
        setOpen(true);
      }
    });
    onConsentChange(existing ?? DEFAULT_CONSENT_STATE);
    // Intentionally once on mount — parent receives initial consent.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount bootstrap only
  }, []);

  if (!open) {
    return (
      <button
        type="button"
        className="fixed bottom-3 left-3 z-[60] rounded-full border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50"
        onClick={() => {
          setCustomize(true);
          setOpen(true);
        }}
      >
        Preferințe cookie
      </button>
    );
  }

  function persist(next: ConsentState) {
    writeConsentDocumentCookie(next);
    setDraft(next);
    onConsentChange(next);
    setOpen(false);
    setCustomize(false);
  }

  return (
    <div
      id="ab-consent"
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-zinc-200 bg-white/95 p-4 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur md:p-5"
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
    >
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h2 id={titleId} className="text-base font-semibold text-zinc-900">
            Cookie-uri și confidențialitate
          </h2>
          <p className="max-w-3xl text-sm leading-6 text-zinc-600">
            Folosim cookie-uri necesare pentru funcționarea site-ului. Analytics și marketing se
            activează doar cu acordul tău. Poți accepta, refuza sau personaliza.
          </p>
          <p className="text-xs text-zinc-500">
            <Link href={privacyHref} className="underline underline-offset-2 hover:text-zinc-800">
              Confidențialitate
            </Link>
            {" · "}
            <Link href={cookiesHref} className="underline underline-offset-2 hover:text-zinc-800">
              Cookie-uri
            </Link>
          </p>
        </div>

        {customize ? (
          <div className="grid gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 sm:grid-cols-2">
            <label className="flex items-start gap-2 text-sm text-zinc-700">
              <input type="checkbox" checked disabled className="mt-1" />
              <span>
                <span className="font-medium">Necesare</span>
                <span className="mt-0.5 block text-xs text-zinc-500">
                  Mereu active — securitate și funcționare de bază.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                className="mt-1"
                checked={draft.preferences}
                onChange={(e) => setDraft((s) => ({ ...s, preferences: e.target.checked }))}
              />
              <span>
                <span className="font-medium">Preferințe</span>
                <span className="mt-0.5 block text-xs text-zinc-500">
                  Memorarea alegerilor UI (unde e cazul).
                </span>
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                className="mt-1"
                checked={draft.analytics}
                onChange={(e) => setDraft((s) => ({ ...s, analytics: e.target.checked }))}
              />
              <span>
                <span className="font-medium">Analytics</span>
                <span className="mt-0.5 block text-xs text-zinc-500">
                  GA4 / măsurare agregată (fără PII).
                </span>
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                className="mt-1"
                checked={draft.marketing}
                onChange={(e) => setDraft((s) => ({ ...s, marketing: e.target.checked }))}
              />
              <span>
                <span className="font-medium">Marketing</span>
                <span className="mt-0.5 block text-xs text-zinc-500">
                  Ads și pixeli (Meta, TikTok, LinkedIn, Google Ads).
                </span>
              </span>
            </label>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-teal-800 px-4 text-sm font-semibold text-white hover:bg-teal-900"
            onClick={() => persist(acceptAllConsent())}
          >
            Acceptă tot
          </button>
          <button
            type="button"
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
            onClick={() => persist(rejectAllConsent())}
          >
            Refuză tot
          </button>
          {customize ? (
            <button
              type="button"
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-teal-700 bg-white px-4 text-sm font-semibold text-teal-900 hover:bg-teal-50"
              onClick={() => persist({ ...draft, version: 1, updatedAt: Date.now() })}
            >
              Salvează preferințele
            </button>
          ) : (
            <button
              type="button"
              className="inline-flex min-h-11 items-center justify-center rounded-md px-4 text-sm font-semibold text-zinc-700 underline-offset-2 hover:underline"
              onClick={() => setCustomize(true)}
            >
              Personalizează
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
