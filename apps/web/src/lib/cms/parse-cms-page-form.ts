/**
 * Shared FormData → raw object for create/update CMS Zod schemas.
 */

function formString(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "");
}

/** Checkbox: present + truthy → true; absent → false. */
function formCheckbox(formData: FormData, key: string): boolean {
  const raw = formData.get(key);
  if (raw == null || raw === "") return false;
  return String(raw) === "true" || String(raw) === "on" || String(raw) === "1";
}

export function parseCmsPageFormFields(formData: FormData) {
  return {
    title: formString(formData, "title"),
    slug: formString(formData, "slug"),
    body: formString(formData, "body"),
    pageKind: formString(formData, "pageKind") || "custom",
    seoTitle: formString(formData, "seoTitle"),
    seoDescription: formString(formData, "seoDescription"),
    h1: formString(formData, "h1"),
    intro: formString(formData, "intro"),
    ctaLabel: formString(formData, "ctaLabel"),
    ctaHref: formString(formData, "ctaHref"),
    ogImagePath: formString(formData, "ogImagePath"),
    canonicalPath: formString(formData, "canonicalPath"),
    noindex: formCheckbox(formData, "noindex"),
    includeInSitemap: formCheckbox(formData, "includeInSitemap"),
    faqJson: formString(formData, "faqJson") || "[]",
    catalogFiltersJson: formString(formData, "catalogFiltersJson") || "{}",
    internalLinksJson: formString(formData, "internalLinksJson") || "[]",
  };
}
