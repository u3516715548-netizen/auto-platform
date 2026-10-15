export type SeoHealthSeverity = "critical" | "warning" | "passed" | "info";

export type SeoHealthCategory =
  | "homepage"
  | "catalog"
  | "vehicle"
  | "cms"
  | "technical"
  | "marketing"
  | "consent";

export type SeoHealthCheckId =
  | "homepage_title"
  | "homepage_meta_description"
  | "homepage_canonical"
  | "homepage_og"
  | "homepage_jsonld"
  | "homepage_indexing_flag"
  | "catalog_query_noindex"
  | "cms_missing_title"
  | "cms_missing_h1"
  | "cms_missing_meta"
  | "cms_thin_content"
  | "cms_invalid_canonical"
  | "cms_noindex_in_sitemap"
  | "cms_indexable_missing_sitemap"
  | "cms_draft_or_archived_public"
  | "cms_inventory_empty_published"
  | "cms_faq_schema_ok"
  | "cms_itemlist_ok"
  | "vehicle_title_meta"
  | "vehicle_canonical"
  | "vehicle_product_jsonld_safe"
  | "vehicle_og"
  | "robots_responds"
  | "robots_indexing_match"
  | "sitemap_responds"
  | "sitemap_no_forbidden_paths"
  | "compara_noindex"
  | "salvate_noindex"
  | "verification_public_match"
  | "consent_banner_present"
  | "tracking_not_loaded_pre_consent"
  | "marketing_ids_configured";

export type SeoHealthIssue = {
  id: SeoHealthCheckId;
  category: SeoHealthCategory;
  severity: SeoHealthSeverity;
  title: string;
  detail: string;
  /** Dashboard path for remediation when applicable. */
  href?: string;
  /** Public path related to the finding. */
  path?: string;
};

export type SeoHealthSummary = {
  critical: number;
  warning: number;
  passed: number;
  info: number;
  /** Internal explanatory score 0–100 — NOT a Google score. */
  internalScore: number;
};

export type SeoHealthReport = {
  tenantSlug: string;
  tenantName: string;
  generatedAt: string;
  methodNotes: string[];
  summary: SeoHealthSummary;
  issues: SeoHealthIssue[];
};

export type SeoHealthLiveSnapshot = {
  homepageHtml?: string;
  robotsTxt?: string;
  sitemapXml?: string;
  comparaHtml?: string;
  salvateHtml?: string;
  /** draft slug probed → HTTP status */
  draftProbe?: { slug: string; status: number };
  fetchErrors?: string[];
};
