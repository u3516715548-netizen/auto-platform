import { notFound } from "next/navigation";
import { requireSettingsOwner } from "@/lib/auth/require-settings-owner";
import { getTenantPageForSettings } from "@/lib/cms/list-tenant-pages";
import { renderTenantPageBodyHtml } from "@/lib/cms/page-body";
import { FeedbackBanner } from "@/components/ui/feedback-banner";

type PageProps = {
  params: Promise<{ pageId: string }>;
};

/**
 * Owner-only draft/published preview — not a public route; noindex implied by dashboard.
 */
export default async function DashboardCmsPagePreviewPage({ params }: PageProps) {
  const session = await requireSettingsOwner();
  const { pageId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(pageId)) notFound();

  const page = await getTenantPageForSettings(session, pageId);
  if (!page) notFound();

  const bodyHtml = renderTenantPageBodyHtml(page.body);

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <p className="text-sm font-medium tracking-wide text-teal-800 uppercase">Preview</p>
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">{page.title}</h2>
        <FeedbackBanner variant="info">
          Preview owner-only —{" "}
          {page.status === "draft" ? "draft (neindexabil public)" : "publicată"}. Nu este
          pagina publică <code className="text-xs">/p/{page.slug}</code>.
        </FeedbackBanner>
      </section>
      <article className="rounded-lg border border-zinc-200 bg-white p-5">
        <div
          className="text-base leading-7 text-zinc-800"
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />
      </article>
    </div>
  );
}
