"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@auto-platform/ui";
import type { StaffBrandingSettings } from "@/lib/tenant/get-tenant-branding";
import type { StorefrontTemplateDefinition } from "@/lib/storefront/templates/registry";
import {
  updateTenantBrandingAction,
  type UpdateTenantBrandingState,
} from "@/lib/tenant/update-tenant-branding";

type ViewportMode = "desktop" | "mobile";

type TemplatePreviewModalProps = {
  template: StorefrontTemplateDefinition;
  branding: StaffBrandingSettings;
  canApply: boolean;
  /** True when viewport is phone-sized — change template is blocked. */
  isPhoneLayout: boolean;
  onClose: () => void;
};

const DESKTOP_FRAME = "min(1100px, calc(100vw - 4rem))";
const MOBILE_FRAME = "390px";

/**
 * Large settings modal: Desktop/Mobil iframe preview + apply template (desktop only).
 */
export function TemplatePreviewModal({
  template,
  branding,
  canApply,
  isPhoneLayout,
  onClose,
}: TemplatePreviewModalProps) {
  const router = useRouter();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState<ViewportMode>("desktop");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewSrc = `/storefront-template-preview?templateId=${encodeURIComponent(template.id)}`;
  const canUseTemplate =
    canApply && !isPhoneLayout && template.status === "ready";

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  async function applyTemplate() {
    if (!canUseTemplate || pending) return;
    const confirmed = window.confirm(
      `Activezi „${template.labelRo}” pentru storefront? Branding-ul curent (culoare, contact) rămâne neschimbat.`,
    );
    if (!confirmed) return;

    setPending(true);
    setError(null);
    const formData = new FormData();
    formData.set("primaryColor", branding.primaryColor);
    formData.set("templateId", template.id);
    formData.set("phone", branding.phone ?? "");
    formData.set("whatsapp", branding.whatsapp ?? "");
    branding.leadNotificationEmails.forEach((email, index) => {
      formData.set(`leadNotificationEmail${index + 1}`, email);
    });

    let result: UpdateTenantBrandingState;
    try {
      result = await updateTenantBrandingAction(null, formData);
    } catch {
      setPending(false);
      setError("Template-ul nu a putut fi salvat. Încearcă din nou.");
      return;
    }

    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onClose();
    router.refresh();
  }

  const frameWidth = viewport === "mobile" ? MOBILE_FRAME : DESKTOP_FRAME;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-zinc-900/50"
        aria-label="Închide previzualizarea"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative z-10 flex h-[min(92dvh,920px)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl outline-none"
      >
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-zinc-200 px-3 py-3 sm:gap-3 sm:px-4">
          <h2
            id={titleId}
            className="min-w-0 flex-1 truncate text-base font-semibold text-zinc-900 sm:text-lg"
          >
            {template.labelRo}
            {template.status === "coming_soon" ? (
              <span className="ml-2 text-sm font-medium text-zinc-500">(în pregătire)</span>
            ) : null}
          </h2>
          <div
            className="inline-flex rounded-lg bg-zinc-100 p-1"
            role="group"
            aria-label="Mod previzualizare"
          >
            <button
              type="button"
              onClick={() => setViewport("desktop")}
              aria-pressed={viewport === "desktop"}
              className={`min-h-9 rounded-md px-3 text-sm font-semibold ${
                viewport === "desktop"
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              Desktop
            </button>
            <button
              type="button"
              onClick={() => setViewport("mobile")}
              aria-pressed={viewport === "mobile"}
              className={`min-h-9 rounded-md px-3 text-sm font-semibold ${
                viewport === "mobile"
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              Mobil
            </button>
          </div>
          <Button type="button" variant="secondary" className="min-h-9 w-auto px-3" onClick={onClose}>
            Închide
          </Button>
        </div>

        <div className="flex min-h-0 flex-1 items-start justify-center overflow-auto bg-zinc-100 p-3 sm:p-5">
          <div
            className="overflow-hidden rounded-xl border border-zinc-300 bg-white shadow-sm transition-[width] duration-200"
            style={{
              width: frameWidth,
              height: viewport === "mobile" ? "min(720px, 75dvh)" : "min(780px, 78dvh)",
            }}
          >
            <iframe
              key={`${template.id}-${viewport}`}
              title={`Previzualizare ${template.labelRo} — ${viewport}`}
              src={previewSrc}
              className="h-full w-full border-0"
            />
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 border-t border-zinc-200 px-3 py-3 sm:px-4">
          {error ? (
            <p className="text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}
          {isPhoneLayout ? (
            <p className="text-sm text-zinc-600">
              Schimbarea template-ului este disponibilă doar pe desktop.
            </p>
          ) : null}
          {!isPhoneLayout && template.status === "coming_soon" ? (
            <p className="text-sm text-zinc-600">
              Acest template este în pregătire și nu poate fi activat încă.
            </p>
          ) : null}
          {!canApply && !isPhoneLayout ? (
            <p className="text-sm text-zinc-600">
              Doar proprietarul poate schimba template-ul storefront.
            </p>
          ) : null}
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              className="min-h-11 w-auto px-4"
              onClick={onClose}
              disabled={pending}
            >
              Anulează
            </Button>
            {canApply ? (
              <Button
                type="button"
                className="min-h-11 w-auto px-4"
                disabled={!canUseTemplate || pending}
                onClick={() => void applyTemplate()}
              >
                {pending ? "Se salvează…" : "Folosește acest template"}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
