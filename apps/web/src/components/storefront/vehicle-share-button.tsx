"use client";

import { useState } from "react";
import { IconShare } from "@/components/storefront/icons";

type VehicleShareButtonProps = {
  title: string;
  /** Absolute or relative URL; defaults to current location when omitted in browser. */
  url?: string;
  className?: string;
};

/**
 * Share vehicle page: Web Share API, else clipboard + “Link copiat”.
 */
export function VehicleShareButton({ title, url, className = "" }: VehicleShareButtonProps) {
  const [feedback, setFeedback] = useState<string | null>(null);

  async function onShare() {
    const shareUrl =
      url ?? (typeof window !== "undefined" ? window.location.href : "");
    if (!shareUrl) return;

    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({ title, url: shareUrl, text: title });
        return;
      }
    } catch (error) {
      // User cancelled share sheet — no fallback noise.
      if (error instanceof DOMException && error.name === "AbortError") return;
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setFeedback("Link copiat");
      window.setTimeout(() => setFeedback(null), 2200);
    } catch {
      setFeedback("Nu s-a putut copia linkul");
      window.setTimeout(() => setFeedback(null), 2200);
    }
  }

  return (
    <div className={`relative shrink-0 ${className}`}>
      <button
        type="button"
        onClick={() => void onShare()}
        className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-[var(--sf-border)] bg-white px-3 text-sm font-semibold text-[var(--sf-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-accent)]"
        aria-label={`Distribuie ${title}`}
      >
        <IconShare size={16} />
        <span className="hidden sm:inline">Distribuie</span>
      </button>
      {feedback ? (
        <p
          className="absolute top-full right-0 z-10 mt-1 whitespace-nowrap rounded-md bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white shadow-sm"
          role="status"
        >
          {feedback}
        </p>
      ) : null}
    </div>
  );
}

/** Pure helper for tests — pick share strategy. */
export function resolveVehicleShareMode(canShare: boolean): "web-share" | "clipboard" {
  return canShare ? "web-share" : "clipboard";
}
