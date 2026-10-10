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
};

export function CmsPageEditForm(props: CmsPageEditFormProps) {
  const [state, formAction, pending] = useActionState(updateTenantPageAction, initial);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      {state?.error ? <FeedbackBanner variant="error">{state.error}</FeedbackBanner> : null}
      {state?.success ? (
        <FeedbackBanner variant="success">Pagina a fost actualizată.</FeedbackBanner>
      ) : null}

      <p className="text-sm text-zinc-600">
        Status: {props.status === "published" ? "Publicată" : "Draft"} ·{" "}
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
          <Label htmlFor="edit-slug">Slug</Label>
          <Input
            id="edit-slug"
            name="slug"
            defaultValue={props.slug}
            required
            maxLength={64}
            disabled={pending || props.pageKind !== "custom"}
          />
          {props.pageKind !== "custom" ? (
            <p className="text-xs text-zinc-500">Slug-urile legale sunt fixe.</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-body">Conținut</Label>
          <textarea
            id="edit-body"
            name="body"
            rows={12}
            defaultValue={props.body}
            maxLength={50000}
            disabled={pending}
            className="rounded-md border border-zinc-200 px-3 py-2 text-sm"
          />
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
          <Label htmlFor="edit-seoDescription">Descriere SEO</Label>
          <Input
            id="edit-seoDescription"
            name="seoDescription"
            defaultValue={props.seoDescription ?? ""}
            maxLength={160}
            disabled={pending}
          />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Se salvează…" : "Salvează"}
        </Button>
      </form>
    </div>
  );
}
