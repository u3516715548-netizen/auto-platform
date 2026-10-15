import { notFound } from "next/navigation";
import { requireSettingsOwner } from "@/lib/auth/require-settings-owner";
import { getTenantPageForSettings } from "@/lib/cms/list-tenant-pages";
import { CmsPageEditForm } from "@/components/dashboard/cms-page-edit-form";

type PageProps = {
  params: Promise<{ pageId: string }>;
};

export default async function DashboardCmsPageEditPage({ params }: PageProps) {
  const session = await requireSettingsOwner();
  const { pageId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(pageId)) notFound();

  const page = await getTenantPageForSettings(session, pageId);
  if (!page) notFound();

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <p className="text-sm font-medium tracking-wide text-teal-800 uppercase">Personalizare</p>
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">Editează pagina</h2>
      </section>
      <CmsPageEditForm
        pageId={page.pageId}
        slug={page.slug}
        title={page.title}
        body={page.body}
        pageKind={page.pageKind}
        status={page.status}
        seoTitle={page.seoTitle}
        seoDescription={page.seoDescription}
        h1={page.h1}
        intro={page.intro}
        ctaLabel={page.ctaLabel}
        ctaHref={page.ctaHref}
        ogImagePath={page.ogImagePath}
        canonicalPath={page.canonicalPath}
        noindex={page.noindex}
        includeInSitemap={page.includeInSitemap}
        faq={page.faq}
        catalogFilters={page.catalogFilters}
        internalLinks={page.internalLinks}
      />
    </div>
  );
}
