"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button, Input, Label } from "@auto-platform/ui";
import type { TenantPageKind, TenantPageStatus } from "@auto-platform/types";
import {
  updateTenantPageAction,
  type TenantPageActionState,
} from "@/lib/cms/tenant-page-actions";
import { FeedbackBanner } from "@/components/ui/feedback-banner";

const initial: TenantPageActionState = { error: null, success: false };

type CmsPageEditFormProps = {
  pageId: string;
  slug: string;
  title: string;
  body: string;
  pageKind: TenantPageKind;
  status: TenantPageStatus;
  seoTitle: string | null;
  seoDescription: string | null;
  h1: string | null;
  intro: string;
  ctaLabel: string | null;
  ctaHref: string | null;
  ogImagePath: string | null;
  canonicalPath: string | null;
  noindex: boolean;
  includeInSitemap: boolean;
  faq: Array<{ question: string; answer: string }>;
  catalogFilters: Record<string, unknown>;
  internalLinks: Array<{ label: string; path: string }>;
};

const LEGAL_KINDS = new Set(["about", "contact", "terms", "privacy", "cookies"]);

export function CmsPageEditForm(props: CmsPageEditFormProps) {
  const [state, formAction, pending] = useActionState(updateTenantPageAction, initial);
  const slugLocked = LEGAL_KINDS.has(props.pageKind);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      {state?.error ? <FeedbackBanner variant="error">{state.error}</FeedbackBanner> : null}
      {state?.success ? (
        <FeedbackBanner variant="success">Pagina a fost actualizată.</FeedbackBanner>
      ) : null}

      <p className="text-sm text-zinc-600">
        Status:{" "}
        {props.status === "published"
          ? "Publicată"
          : props.status === "archived"
            ? "Arhivată"
            : "Draft"}{" "}
        ·{" "}
        <Link
          href={`/dashboard/settings/customization/pages/${props.pageId}/preview`}
          className="font-medium text-teal-800 underline-offset-2 hover:underline"
        >
          Preview
        </Link>
        {props.status === "published" ? (
          <>
            {" · "}
            <Link
              href={`/p/${props.slug}`}
              className="font-medium text-teal-800 underline-offset-2 hover:underline"
              target="_blank"
            >
              Vezi public
            </Link>
          </>
        ) : null}
      </p>

      <FeedbackBanner variant="info">
        Draft/archived nu apar public. Publish cere conținut editorial suficient + meta
        description; tipurile de inventar cer filtre + cel puțin un vehicul disponibil.
      </FeedbackBanner>

      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="pageId" value={props.pageId} />
        <input type="hidden" name="pageKind" value={props.pageKind} />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-title">Titlu</Label>
          <Input
            id="edit-title"
            name="title"
            defaultValue={props.title}
            required
            maxLength={160}
            disabled={pending}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-h1">H1 (opțional — fallback pe titlu)</Label>
          <Input id="edit-h1" name="h1" defaultValue={props.h1 ?? ""} maxLength={160} disabled={pending} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-slug">Slug</Label>
          <Input
            id="edit-slug"
            name="slug"
            defaultValue={props.slug}
            required
            maxLength={64}
            disabled={pending || slugLocked}
          />
          {slugLocked ? (
            <p className="text-xs text-zinc-500">Slug-urile legale sunt fixe.</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-intro">Intro</Label>
          <textarea
            id="edit-intro"
            name="intro"
            rows={3}
            defaultValue={props.intro}
            maxLength={2000}
            disabled={pending}
            className="rounded-md border border-zinc-200 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-body">Conținut (body)</Label>
          <textarea
            id="edit-body"
            name="body"
            rows={10}
            defaultValue={props.body}
            maxLength={50000}
            disabled={pending}
            className="rounded-md border border-zinc-200 px-3 py-2 text-sm"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-ctaLabel">CTA label</Label>
            <Input
              id="edit-ctaLabel"
              name="ctaLabel"
              defaultValue={props.ctaLabel ?? ""}
              maxLength={80}
              disabled={pending}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-ctaHref">CTA path (ex. `/` sau `/p/contact`)</Label>
            <Input
              id="edit-ctaHref"
              name="ctaHref"
              defaultValue={props.ctaHref ?? ""}
              maxLength={200}
              disabled={pending}
              placeholder="/#contact"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-seoTitle">Titlu SEO</Label>
          <Input
            id="edit-seoTitle"
            name="seoTitle"
            defaultValue={props.seoTitle ?? ""}
            maxLength={70}
            disabled={pending}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-seoDescription">Meta description (obligatorie la publish)</Label>
          <Input
            id="edit-seoDescription"
            name="seoDescription"
            defaultValue={props.seoDescription ?? ""}
            maxLength={160}
            disabled={pending}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-canonicalPath">Canonical path override (relativ, opțional)</Label>
          <Input
            id="edit-canonicalPath"
            name="canonicalPath"
            defaultValue={props.canonicalPath ?? ""}
            maxLength={200}
            disabled={pending}
            placeholder="/p/slug-canonic"
          />
          <p className="text-xs text-zinc-500">
            Doar path local. Invalid → self-canonical `/p/{props.slug}`. URL absolut respins.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-ogImagePath">OG image path (opțional)</Label>
          <Input
            id="edit-ogImagePath"
            name="ogImagePath"
            defaultValue={props.ogImagePath ?? ""}
            maxLength={500}
            disabled={pending}
          />
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              name="noindex"
              value="true"
              defaultChecked={props.noindex}
              disabled={pending}
            />
            noindex
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              name="includeInSitemap"
              value="true"
              defaultChecked={props.includeInSitemap}
              disabled={pending}
            />
            include în sitemap
          </label>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-faqJson">FAQ JSON</Label>
          <textarea
            id="edit-faqJson"
            name="faqJson"
            rows={4}
            defaultValue={JSON.stringify(props.faq, null, 2)}
            disabled={pending}
            className="rounded-md border border-zinc-200 px-3 py-2 font-mono text-xs"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-catalogFiltersJson">Catalog filters JSON (inventar)</Label>
          <textarea
            id="edit-catalogFiltersJson"
            name="catalogFiltersJson"
            rows={4}
            defaultValue={JSON.stringify(props.catalogFilters, null, 2)}
            disabled={pending}
            className="rounded-md border border-zinc-200 px-3 py-2 font-mono text-xs"
            placeholder='{"make":["BMW"],"fuel":["diesel"]}'
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-internalLinksJson">Internal links JSON</Label>
          <textarea
            id="edit-internalLinksJson"
            name="internalLinksJson"
            rows={3}
            defaultValue={JSON.stringify(props.internalLinks, null, 2)}
            disabled={pending}
            className="rounded-md border border-zinc-200 px-3 py-2 font-mono text-xs"
            placeholder='[{"label":"Stoc","path":"/"}]'
          />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Se salvează…" : "Salvează"}
        </Button>
      </form>
    </div>
  );
}
