"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { Button } from "@auto-platform/ui";
import type { StorefrontTemplateDefinition } from "@/lib/storefront/templates/registry";
import {
  applyStorefrontTemplateAction,
  type ApplyStorefrontTemplateState,
} from "@/lib/tenant/apply-storefront-template";
import { DemoStorefrontPreview } from "@/components/dashboard/themes/demo-storefront-preview";
import { ApplyThemeConfirm } from "@/components/dashboard/themes/apply-theme-confirm";

type ThemePreviewShellProps = {
  template: StorefrontTemplateDefinition;
  isActive: boolean;
};

type ViewportMode = "desktop" | "mobile";

const PHONE_LAYOUT_MQ = "(max-width: 767px)";
const THEMES_HREF = "/dashboard/settings/customization/themes";

function subscribePhoneLayout(onChange: () => void) {
  const mq = window.matchMedia(PHONE_LAYOUT_MQ);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function getPhoneLayoutSnapshot() {
  return window.matchMedia(PHONE_LAYOUT_MQ).matches;
}

function getPhoneLayoutServerSnapshot() {
  return false;
}

function IconDesktop({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="4" width="18" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 20h8M12 16v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconMobile({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="7" y="2.5" width="10" height="19" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M11 18.5h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Full-screen theme preview chrome (covers dashboard shell).
 * Demo data only — apply persists templateId only after explicit confirm.
 *
 * Înapoi: navigates to Theme Gallery in this same preview tab
 * (the gallery tab that opened us via target=_blank stays open).
 */
export function ThemePreviewShell({ template, isActive }: ThemePreviewShellProps) {
  const router = useRouter();
  const [viewport, setViewport] = useState<ViewportMode>("desktop");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isPhoneLayout = useSyncExternalStore(
    subscribePhoneLayout,
    getPhoneLayoutSnapshot,
    getPhoneLayoutServerSnapshot,
  );

  const canApply = !isPhoneLayout && template.status === "ready" && !isActive;
  const comingSoon = template.status === "coming_soon";

  const frameClass =
    viewport === "mobile"
      ? "h-[min(780px,calc(100dvh-8rem))] w-full max-w-[390px]"
      : "h-[min(820px,calc(100dvh-8rem))] w-full max-w-[1100px]";

  async function confirmApply() {
    if (!canApply || pending) return;
    setPending(true);
    setError(null);
    const formData = new FormData();
    formData.set("templateId", template.id);
    let result: ApplyStorefrontTemplateState;
    try {
      result = await applyStorefrontTemplateAction(null, formData);
    } catch {
      setPending(false);
      setError("Tema nu a putut fi salvată. Încearcă din nou.");
      return;
    }
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setConfirmOpen(false);
    router.push(THEMES_HREF);
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-900 text-white">
      <header className="shrink-0 border-b border-zinc-700 bg-zinc-950 px-3 py-2.5 sm:px-4">
        <div className="grid grid-cols-2 items-center gap-x-2 gap-y-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          <div className="flex min-w-0 items-center gap-2 justify-self-start">
            <Link
              href={THEMES_HREF}
              className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-zinc-100 hover:bg-zinc-800"
            >
              <span aria-hidden>←</span>
              Înapoi
            </Link>
            <p className="min-w-0 truncate text-sm font-semibold sm:text-base">
              {template.labelRo}
              {comingSoon ? (
                <span className="ml-2 text-xs font-medium text-zinc-400">În pregătire</span>
              ) : null}
              {isActive ? (
                <span className="ml-2 rounded-full bg-teal-700 px-2 py-0.5 text-xs font-semibold">
                  Activă
                </span>
              ) : null}
            </p>
          </div>

          <div
            className="col-span-2 flex justify-center justify-self-center sm:col-span-1 sm:col-start-2 sm:row-start-1"
            role="group"
            aria-label="Tip previzualizare"
          >
            <div className="inline-flex rounded-lg bg-zinc-800 p-1">
              <button
                type="button"
                aria-pressed={viewport === "desktop"}
                onClick={() => setViewport("desktop")}
                className={`inline-flex min-h-9 items-center gap-1.5 rounded-md px-3 text-sm font-semibold ${
                  viewport === "desktop"
                    ? "bg-white text-zinc-900"
                    : "text-zinc-300 hover:text-white"
                }`}
              >
                <IconDesktop />
                Desktop
              </button>
              <button
                type="button"
                aria-pressed={viewport === "mobile"}
                onClick={() => setViewport("mobile")}
                className={`inline-flex min-h-9 items-center gap-1.5 rounded-md px-3 text-sm font-semibold ${
                  viewport === "mobile"
                    ? "bg-white text-zinc-900"
                    : "text-zinc-300 hover:text-white"
                }`}
              >
                <IconMobile />
                Mobil
              </button>
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-self-end sm:col-start-3 sm:row-start-1">
            {!isPhoneLayout ? (
              <Button
                type="button"
                className="min-h-10 w-auto px-4"
                disabled={!canApply || pending}
                onClick={() => setConfirmOpen(true)}
                title={
                  comingSoon
                    ? "Tema este în pregătire"
                    : isActive
                      ? "Tema este deja activă"
                      : undefined
                }
              >
                Folosește această temă
              </Button>
            ) : (
              <span className="text-xs text-zinc-400">Aplicare pe desktop</span>
            )}
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-start overflow-auto p-3 sm:p-5">
        {isPhoneLayout ? (
          <p className="mb-3 w-full max-w-lg text-center text-sm text-zinc-300">
            Schimbarea temei este disponibilă doar pe desktop.
          </p>
        ) : null}
        {comingSoon && !isPhoneLayout ? (
          <p className="mb-3 w-full max-w-lg text-center text-sm text-zinc-300">
            Această temă este în pregătire și nu poate fi activată încă.
          </p>
        ) : null}
        {error ? (
          <p className="mb-3 text-sm text-red-300" role="alert">
            {error}
          </p>
        ) : null}

        <div
          className={`overflow-hidden rounded-2xl border border-zinc-600 bg-white text-zinc-900 shadow-2xl ${frameClass}`}
        >
          <DemoStorefrontPreview template={template} viewport={viewport} />
        </div>
        <p className="mt-3 text-center text-xs text-zinc-400">
          Preview demo izolat — fără date reale, fără scriere în baza de date.
        </p>
      </div>

      {confirmOpen ? (
        <ApplyThemeConfirm
          templateLabel={template.labelRo}
          pending={pending}
          onCancel={() => {
            if (!pending) setConfirmOpen(false);
          }}
          onConfirm={() => void confirmApply()}
        />
      ) : null}
    </div>
  );
}
