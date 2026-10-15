import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireSettingsOwner } from "@/lib/auth/require-settings-owner";
import { getTenantPageForSettings } from "@/lib/cms/list-tenant-pages";
import { renderTenantPageBodyHtml } from "@/lib/cms/page-body";
import { FeedbackBanner } from "@/components/ui/feedback-banner";

type PageProps = {
  params: Promise<{ pageId: string }>;
};

/** Owner-only preview — never indexable, never in sitemap, no storefront tracking. */
export const metadata: Metadata = {
  title: "Preview pagină CMS",
  robots: { index: false, follow: false, nocache: true },
};

export default async function DashboardCmsPagePreviewPage({ params }: PageProps) {
  const session = await requireSettingsOwner();
  const { pageId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(pageId)) notFound();

  const page = await getTenantPageForSettings(session, pageId);
  if (!page) notFound();

  const bodyHtml = renderTenantPageBodyHtml(page.body);
  const heading = page.h1?.trim() || page.title;

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <p className="text-sm font-medium tracking-wide text-teal-800 uppercase">Preview</p>
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">{heading}</h2>
        <FeedbackBanner variant="info">
          Preview owner-only — noindex, în afara sitemap, fără tracking storefront. Nu este
          pagina publică <code className="text-xs">/p/{page.slug}</code>.
        </FeedbackBanner>
      </section>
      <article className="rounded-lg border border-zinc-200 bg-white p-5">
        {page.intro?.trim() ? (
          <p className="mb-4 text-sm leading-6 text-zinc-600">{page.intro}</p>
        ) : null}
        <div
          className="text-base leading-7 text-zinc-800"
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />
        {page.faq.length > 0 ? (
          <section className="mt-8 border-t border-zinc-100 pt-6">
            <h3 className="text-base font-semibold text-zinc-900">FAQ</h3>
            <dl className="mt-3 flex flex-col gap-3">
              {page.faq.map((item) => (
                <div key={item.question}>
                  <dt className="font-medium text-zinc-900">{item.question}</dt>
                  <dd className="mt-1 text-sm text-zinc-600">{item.answer}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}
      </article>
    </div>
  );
}
