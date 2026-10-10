"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@auto-platform/ui";
import {
  themePreviewPath,
  type StorefrontTemplateDefinition,
} from "@/lib/storefront/templates/registry";
import {
  applyStorefrontTemplateAction,
  type ApplyStorefrontTemplateState,
} from "@/lib/tenant/apply-storefront-template";
import { ThemeThumbnail } from "@/components/dashboard/themes/theme-thumbnail";
import { ApplyThemeConfirm } from "@/components/dashboard/themes/apply-theme-confirm";
import { FeedbackBanner } from "@/components/ui/feedback-banner";

type ThemeGalleryProps = {
  templates: StorefrontTemplateDefinition[];
  activeTemplateId: string;
};

const previewLinkProps = {
  target: "_blank",
  rel: "noopener noreferrer",
} as const;

function ThemeCard({
  template,
  isActive,
  onRequestApply,
}: {
  template: StorefrontTemplateDefinition;
  isActive: boolean;
  onRequestApply: (template: StorefrontTemplateDefinition) => void;
}) {
  const canApply = template.status === "ready" && !isActive;
  const comingSoon = template.status === "coming_soon";

  return (
    <article className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="relative aspect-[16/10] overflow-hidden">
        <ThemeThumbnail template={template} className="h-full w-full" />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-zinc-950/0 transition-colors duration-200 group-hover:bg-zinc-950/35 group-focus-within:bg-zinc-950/35">
          <Link
            href={themePreviewPath(template.id)}
            {...previewLinkProps}
            className="pointer-events-auto inline-flex min-h-11 translate-y-1 items-center rounded-full bg-white px-5 text-sm font-semibold text-zinc-900 opacity-0 shadow-md ring-1 ring-zinc-200 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100 focus-visible:translate-y-0 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800"
          >
            Previzualizează
          </Link>
        </div>
      </div>
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-zinc-900">{template.labelRo}</h3>
            {isActive ? (
              <span className="rounded-full bg-teal-800 px-2.5 py-0.5 text-xs font-semibold text-white">
                Activă
              </span>
            ) : null}
            {comingSoon ? (
              <span className="rounded-full bg-zinc-200 px-2.5 py-0.5 text-xs font-semibold text-zinc-700">
                În pregătire
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm leading-5 text-zinc-600">{template.descriptionRo}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link
            href={themePreviewPath(template.id)}
            {...previewLinkProps}
            className="inline-flex min-h-10 items-center justify-center rounded-md bg-white px-3 text-sm font-semibold text-zinc-900 ring-1 ring-zinc-300 hover:bg-zinc-50"
          >
            Previzualizează
          </Link>
          {isActive ? (
            <Button type="button" variant="secondary" className="min-h-10 w-auto px-3" disabled>
              Tema activă
            </Button>
          ) : comingSoon ? (
            <Button
              type="button"
              className="min-h-10 w-auto px-3"
              disabled
              title="Tema este în pregătire și nu poate fi activată încă"
            >
              Folosește tema
            </Button>
          ) : (
            <Button
              type="button"
              className="min-h-10 w-auto px-3"
              disabled={!canApply}
              onClick={() => onRequestApply(template)}
            >
              Folosește tema
            </Button>
          )}
        </div>
      </div>
      {comingSoon ? (
        <p className="border-t border-zinc-100 px-4 py-2.5 text-xs text-zinc-500">
          Poți previzualiza tema. Activarea va fi disponibilă când statusul trece la gata de folosit.
        </p>
      ) : canApply ? (
        <p className="border-t border-zinc-100 px-4 py-2.5 text-xs text-zinc-500">
          Previzualizarea folosește date demo. Activarea folosește datele reale ale dealerului.
        </p>
      ) : null}
    </article>
  );
}

export function ThemeGallery({ templates, activeTemplateId }: ThemeGalleryProps) {
  const router = useRouter();
  const [confirmTemplate, setConfirmTemplate] =
    useState<StorefrontTemplateDefinition | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const active =
    templates.find((t) => t.id === activeTemplateId) ??
    templates.find((t) => t.status === "ready") ??
    templates[0];

  async function confirmApply() {
    if (!confirmTemplate || pending) return;
    setPending(true);
    setError(null);
    setSuccess(false);
    const formData = new FormData();
    formData.set("templateId", confirmTemplate.id);
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
    setConfirmTemplate(null);
    setSuccess(true);
    router.refresh();
  }

  if (templates.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 bg-white px-4 py-10 text-center">
        <p className="text-base font-medium text-zinc-900">Nicio temă disponibilă.</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-zinc-600">
          Tempele vor apărea aici pe măsură ce sunt publicate în registry.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {error ? <FeedbackBanner variant="error">{error}</FeedbackBanner> : null}
      {success ? (
        <FeedbackBanner variant="success">Tema a fost activată pe storefront.</FeedbackBanner>
      ) : null}

      {active ? (
        <section className="flex flex-col gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-zinc-900">Tema activă</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-600">
              Schimbarea temei modifică structura vizuală a storefront-ului (layout, ierarhie,
              componente). Datele și brandingul rămân intacte.
            </p>
          </div>
          <article className="overflow-hidden rounded-2xl border border-teal-700/40 bg-white shadow-sm ring-1 ring-teal-800/10">
            <div className="relative aspect-[21/9] max-h-64 overflow-hidden sm:aspect-[24/9]">
              <ThemeThumbnail template={active} className="h-full w-full" />
            </div>
            <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-semibold text-zinc-900">{active.labelRo}</h3>
                  <span className="rounded-full bg-teal-800 px-2.5 py-0.5 text-xs font-semibold text-white">
                    Activă
                  </span>
                </div>
                <p className="mt-1 text-sm text-zinc-600">{active.descriptionRo}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={themePreviewPath(active.id)}
                  {...previewLinkProps}
                  className="inline-flex min-h-11 items-center justify-center rounded-md bg-white px-4 text-sm font-semibold text-zinc-900 ring-1 ring-zinc-300 hover:bg-zinc-50"
                >
                  Previzualizează
                </Link>
                <Link
                  href="/dashboard/settings/customization/preferences"
                  className="inline-flex min-h-11 items-center justify-center rounded-md bg-white px-4 text-sm font-semibold text-zinc-900 ring-1 ring-zinc-300 hover:bg-zinc-50"
                >
                  Preferințe branding
                </Link>
              </div>
            </div>
          </article>
        </section>
      ) : null}

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900">Descoperă teme</h2>
        <ul className="grid gap-5 lg:grid-cols-2">
          {templates.map((template) => (
            <li key={template.id}>
              <ThemeCard
                template={template}
                isActive={template.id === activeTemplateId}
                onRequestApply={setConfirmTemplate}
              />
            </li>
          ))}
        </ul>
      </section>

      {confirmTemplate ? (
        <ApplyThemeConfirm
          templateLabel={confirmTemplate.labelRo}
          pending={pending}
          onCancel={() => {
            if (!pending) setConfirmTemplate(null);
          }}
          onConfirm={() => void confirmApply()}
        />
      ) : null}
    </div>
  );
}
