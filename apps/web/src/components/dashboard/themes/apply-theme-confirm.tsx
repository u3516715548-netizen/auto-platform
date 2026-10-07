"use client";

import { useEffect, useId, useRef } from "react";
import { Button } from "@auto-platform/ui";

type ApplyThemeConfirmProps = {
  templateLabel: string;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

/**
 * Explicit confirmation before persisting templateId.
 */
export function ApplyThemeConfirm({
  templateLabel,
  pending,
  onCancel,
  onConfirm,
}: ApplyThemeConfirmProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panelRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-zinc-900/50"
        aria-label="Anulează"
        onClick={onCancel}
        disabled={pending}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative z-10 w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl outline-none"
      >
        <h2 id={titleId} className="text-lg font-semibold text-zinc-900">
          Folosești „{templateLabel}”?
        </h2>
        <p className="mt-3 text-sm leading-6 text-zinc-600">
          Vei schimba structura vizuală a site-ului tău.
        </p>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          Mașinile, datele firmei, contactele și culorile de branding existente nu vor fi șterse.
        </p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            className="min-h-11 w-auto px-4"
            onClick={onCancel}
            disabled={pending}
          >
            Anulează
          </Button>
          <Button
            type="button"
            className="min-h-11 w-auto px-4"
            onClick={onConfirm}
            disabled={pending}
          >
            {pending ? "Se salvează…" : "Folosește tema"}
          </Button>
        </div>
      </div>
    </div>
  );
}
