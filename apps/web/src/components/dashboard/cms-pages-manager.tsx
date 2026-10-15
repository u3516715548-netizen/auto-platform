"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button, Input, Label } from "@auto-platform/ui";
import type { TenantPageListItem } from "@auto-platform/types";
import {
  archiveTenantPageAction,
  createTenantPageAction,
  deleteTenantPageAction,
  publishTenantPageAction,
  unpublishTenantPageAction,
  type TenantPageActionState,
} from "@/lib/cms/tenant-page-actions";
import { FeedbackBanner } from "@/components/ui/feedback-banner";

const initial: TenantPageActionState = { error: null, success: false };

const KIND_OPTIONS = [
  { value: "custom", label: "Personalizată" },
  { value: "about", label: "Despre (despre)" },
  { value: "contact", label: "Contact (contact)" },
  { value: "terms", label: "Termeni (termeni)" },
  { value: "privacy", label: "Confidențialitate (confidentialitate)" },
  { value: "cookies", label: "Cookies (cookies)" },
  { value: "local_inventory", label: "Inventar localitate" },
  { value: "brand_inventory", label: "Inventar marcă" },
  { value: "body_type_inventory", label: "Inventar caroserie" },
  { value: "fuel_inventory", label: "Inventar combustibil" },
  { value: "financing", label: "Finanțare" },
  { value: "buyback", label: "Buy-back" },
  { value: "warranty", label: "Garanție" },
  { value: "service", label: "Servicii" },
] as const;

type CmsPagesManagerProps = {
  pages: TenantPageListItem[];
};

function ActionFeedback({ state }: { state: TenantPageActionState | null }) {
  if (!state) return null;
  if (state.error) return <FeedbackBanner variant="error">{state.error}</FeedbackBanner>;
  if (state.success) {
    return <FeedbackBanner variant="success">Modificarea a fost salvată.</FeedbackBanner>;
  }
  return null;
}

function statusLabel(status: TenantPageListItem["status"]): string {
  if (status === "published") return "Publicată";
  if (status === "archived") return "Arhivată";
  return "Draft";
}

function indexabilityLabel(page: TenantPageListItem): string {
  if (page.status !== "published") return "neindexabilă";
  if (page.noindex) return "noindex";
  if (!page.includeInSitemap) return "indexabilă, fără sitemap";
  return "indexabilă + sitemap";
}

export function CmsPagesManager({ pages }: CmsPagesManagerProps) {
  const [createState, createAction, createPending] = useActionState(
    createTenantPageAction,
    initial,
  );
  const [publishState, publishAction, publishPending] = useActionState(
    publishTenantPageAction,
    initial,
  );
  const [unpublishState, unpublishAction, unpublishPending] = useActionState(
    unpublishTenantPageAction,
    initial,
  );
  const [archiveState, archiveAction, archivePending] = useActionState(
    archiveTenantPageAction,
    initial,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteTenantPageAction,
    initial,
  );

  const busy =
    createPending || publishPending || unpublishPending || archivePending || deletePending;

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <ActionFeedback state={createState} />
      <ActionFeedback state={publishState} />
      <ActionFeedback state={unpublishState} />
      <ActionFeedback state={archiveState} />
      <ActionFeedback state={deleteState} />

      <section className="flex flex-col gap-4">
        <div>
          <h3 className="text-base font-semibold text-zinc-900">Pagini existente</h3>
          <p className="mt-1 text-sm text-zinc-600">
            Doar paginile publicate apar pe storefront la{" "}
            <code className="text-xs">/p/[slug]</code>. Sitemap: published + indexable +
            include_in_sitemap + self-canonical.
          </p>
        </div>

        {pages.length === 0 ? (
          <p className="text-sm text-zinc-600">Nu există pagini încă.</p>
        ) : (
          <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
            {pages.map((page) => (
              <li
                key={page.pageId}
                className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-zinc-900">{page.title}</p>
                  <p className="text-xs text-zinc-500">
                    /p/{page.slug} · {statusLabel(page.status)} · {page.pageKind} ·{" "}
                    {indexabilityLabel(page)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/dashboard/settings/customization/pages/${page.pageId}`}
                    className="inline-flex h-9 items-center rounded-md border border-zinc-200 px-3 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
                  >
                    Editează
                  </Link>
                  <Link
                    href={`/dashboard/settings/customization/pages/${page.pageId}/preview`}
                    className="inline-flex h-9 items-center rounded-md border border-zinc-200 px-3 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
                  >
                    Preview
                  </Link>
                  {page.status === "draft" || page.status === "archived" ? (
                    <form action={publishAction}>
                      <input type="hidden" name="pageId" value={page.pageId} />
                      <Button type="submit" disabled={busy} className="h-9">
                        Publică
                      </Button>
                    </form>
                  ) : (
                    <form action={unpublishAction}>
                      <input type="hidden" name="pageId" value={page.pageId} />
                      <Button type="submit" disabled={busy} variant="secondary" className="h-9">
                        Unpublish
                      </Button>
                    </form>
                  )}
                  {page.status !== "archived" ? (
                    <form action={archiveAction}>
                      <input type="hidden" name="pageId" value={page.pageId} />
                      <Button type="submit" disabled={busy} variant="secondary" className="h-9">
                        Arhivează
                      </Button>
                    </form>
                  ) : null}
                  <form action={deleteAction}>
                    <input type="hidden" name="pageId" value={page.pageId} />
                    <Button type="submit" disabled={busy} variant="secondary" className="h-9">
                      Șterge
                    </Button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-4 sm:p-5">
        <div>
          <h3 className="text-base font-semibold text-zinc-900">Pagină nouă</h3>
          <p className="mt-1 text-sm text-zinc-600">
            Se creează ca draft. Completează SEO + conținut înainte de Publish. Tipurile de
            inventar cer filtre pe pagina de editare.
          </p>
        </div>
        <form action={createAction} className="flex flex-col gap-4">
          <input type="hidden" name="faqJson" value="[]" />
          <input type="hidden" name="catalogFiltersJson" value="{}" />
          <input type="hidden" name="internalLinksJson" value="[]" />
          <input type="hidden" name="includeInSitemap" value="true" />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cms-title">Titlu</Label>
            <Input id="cms-title" name="title" required maxLength={160} disabled={busy} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cms-pageKind">Tip</Label>
            <select
              id="cms-pageKind"
              name="pageKind"
              defaultValue="custom"
              disabled={busy}
              className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm"
            >
              {KIND_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cms-slug">Slug</Label>
            <Input
              id="cms-slug"
              name="slug"
              required
              maxLength={64}
              disabled={busy}
              placeholder="masini-bmw-bucuresti"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cms-body">Conținut</Label>
            <textarea
              id="cms-body"
              name="body"
              rows={8}
              maxLength={50000}
              disabled={busy}
              className="rounded-md border border-zinc-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cms-seoTitle">Titlu SEO (opțional)</Label>
            <Input id="cms-seoTitle" name="seoTitle" maxLength={70} disabled={busy} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cms-seoDescription">Descriere SEO (opțional la draft)</Label>
            <Input
              id="cms-seoDescription"
              name="seoDescription"
              maxLength={160}
              disabled={busy}
            />
          </div>
          <Button type="submit" disabled={busy}>
            {createPending ? "Se creează…" : "Creează draft"}
          </Button>
        </form>
      </section>
    </div>
  );
}
