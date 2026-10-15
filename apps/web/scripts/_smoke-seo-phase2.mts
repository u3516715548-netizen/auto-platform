/**
 * Local Phase 2 SEO smoke helpers — not part of product runtime.
 * Usage: pnpm exec tsx apps/web/scripts/_smoke-seo-phase2.mts <command>
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import postgres from "postgres";

config({ path: resolve(process.cwd(), "apps/web/.env.local") });
config({ path: resolve(process.cwd(), ".env.local") });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL missing");
  process.exit(1);
}

const sql = postgres(url, { max: 1 });
const cmd = process.argv[2] ?? "verify";

async function verify() {
  const cols = await sql`
    select column_name from information_schema.columns
    where table_schema = 'public' and table_name = 'tenant_seo_settings'
    order by ordinal_position
  `;
  console.log(
    "COLUMNS",
    cols.map((c) => c.column_name).join(","),
  );

  const fn = await sql`
    select pg_get_function_result(p.oid) as result
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'app' and p.proname = 'public_seo_settings'
  `;
  console.log("FN_RESULT", fn[0]?.result);

  const tenants = await sql`
    select id, slug, name, status from tenants
    where status in ('active', 'trial')
    order by slug
    limit 10
  `;
  console.log("TENANTS", JSON.stringify(tenants, null, 2));

  const mig = await sql`
    select id, hash, created_at from drizzle.__drizzle_migrations
    order by created_at desc
    limit 5
  `;
  console.log("MIGRATIONS_TAIL", JSON.stringify(mig, null, 2));
}

async function seedSeo() {
  const tenants = await sql<{ id: string; slug: string; name: string }[]>`
    select id, slug, name from tenants
    where status in ('active', 'trial')
    order by slug
    limit 5
  `;
  if (tenants.length < 2) {
    console.error("Need at least 2 active/trial tenants for A/B smoke");
    process.exit(1);
  }
  const a = tenants[0]!;
  const b = tenants[1]!;
  await sql`
    insert into tenant_seo_settings (
      tenant_id, seo_title_default, seo_description_default,
      indexing_enabled, title_template, og_image_path, twitter_handle,
      created_at, updated_at
    ) values (
      ${a.id}::uuid,
      ${`${a.name} SEO A`},
      ${`Desc SEO tenant A (${a.slug})`},
      true,
      ${"%s | {dealer}"},
      ${"https://cdn.example.com/og-a.jpg"},
      ${"tenant_a"},
      now(), now()
    )
    on conflict (tenant_id) do update set
      seo_title_default = excluded.seo_title_default,
      seo_description_default = excluded.seo_description_default,
      indexing_enabled = true,
      title_template = excluded.title_template,
      og_image_path = excluded.og_image_path,
      twitter_handle = excluded.twitter_handle,
      updated_at = now()
  `;
  await sql`
    insert into tenant_seo_settings (
      tenant_id, seo_title_default, seo_description_default,
      indexing_enabled, title_template, og_image_path, twitter_handle,
      created_at, updated_at
    ) values (
      ${b.id}::uuid,
      ${`${b.name} SEO B`},
      ${`Desc SEO tenant B (${b.slug})`},
      true,
      ${"%s · {dealer}"},
      ${"https://cdn.example.com/og-b.jpg"},
      ${"tenant_b"},
      now(), now()
    )
    on conflict (tenant_id) do update set
      seo_title_default = excluded.seo_title_default,
      seo_description_default = excluded.seo_description_default,
      indexing_enabled = true,
      title_template = excluded.title_template,
      og_image_path = excluded.og_image_path,
      twitter_handle = excluded.twitter_handle,
      updated_at = now()
  `;

  const pubA = await sql`select * from app.public_seo_settings(${a.id}::uuid)`;
  const pubB = await sql`select * from app.public_seo_settings(${b.id}::uuid)`;
  console.log(
    JSON.stringify(
      {
        a: { slug: a.slug, name: a.name, public: pubA[0] },
        b: { slug: b.slug, name: b.name, public: pubB[0] },
      },
      null,
      2,
    ),
  );
}

async function setIndexing(slug: string, enabled: boolean) {
  const rows = await sql`
    update tenant_seo_settings s
    set indexing_enabled = ${enabled}, updated_at = now()
    from tenants t
    where s.tenant_id = t.id and t.slug = ${slug}
    returning t.slug, s.indexing_enabled
  `;
  console.log(JSON.stringify(rows, null, 2));
}

async function seedMarketing(slug: string) {
  const t = await sql`
    select id, slug from tenants where slug = ${slug} limit 1
  `;
  if (!t[0]) {
    console.error("tenant not found", slug);
    process.exit(1);
  }
  await sql`
    insert into tenant_marketing_integrations (
      tenant_id, gtm_container_id, gtm_enabled,
      google_search_console_verification,
      meta_pixel_id, meta_pixel_enabled,
      created_at, updated_at
    ) values (
      ${t[0].id}::uuid,
      ${`GTM-SMOKE${slug === "acme" ? "A" : "B"}`},
      true,
      ${`gsc-${slug}-token`},
      ${slug === "acme" ? "999888777666555" : "111222333444555"},
      false,
      now(), now()
    )
    on conflict (tenant_id) do update set
      gtm_container_id = excluded.gtm_container_id,
      gtm_enabled = true,
      google_search_console_verification = excluded.google_search_console_verification,
      meta_pixel_id = excluded.meta_pixel_id,
      meta_pixel_enabled = false,
      updated_at = now()
  `;
  console.log(JSON.stringify({ seededMarketing: t[0].slug }, null, 2));
}

async function seedCmsPage(slug: string) {
  const t = await sql`
    select id, slug, name from tenants where slug = ${slug} limit 1
  `;
  if (!t[0]) {
    console.error("tenant not found", slug);
    process.exit(1);
  }
  await sql`
    insert into tenant_pages (
      tenant_id, slug, title, body, status, page_kind, locale,
      seo_title, seo_description, published_at, created_at, updated_at
    ) values (
      ${t[0].id}::uuid,
      'despre',
      ${`Despre ${t[0].name}`},
      ${`Pagina Despre pentru smoke SEO ${t[0].slug}.`},
      'published',
      'about',
      'ro',
      ${`Despre ${t[0].name} SEO`},
      ${`Meta despre ${t[0].slug}`},
      now(), now(), now()
    )
    on conflict (tenant_id, slug) do update set
      title = excluded.title,
      body = excluded.body,
      status = 'published',
      page_kind = 'about',
      seo_title = excluded.seo_title,
      seo_description = excluded.seo_description,
      published_at = coalesce(tenant_pages.published_at, now()),
      updated_at = now()
  `;
  console.log(JSON.stringify({ seeded: "despre", tenant: t[0].slug }, null, 2));
}

async function listPublicPaths(slug: string) {
  const t = await sql`
    select id, slug, name from tenants where slug = ${slug} limit 1
  `;
  if (!t[0]) {
    console.error("tenant not found", slug);
    process.exit(1);
  }
  const vehicles = await sql`
    select slug from vehicles
    where tenant_id = ${t[0].id}::uuid and status = 'available'
    order by slug limit 3
  `;
  const pages = await sql`
    select slug from tenant_pages
    where tenant_id = ${t[0].id}::uuid and status = 'published'
    order by slug limit 5
  `;
  console.log(
    JSON.stringify(
      { tenant: t[0], vehicles, pages },
      null,
      2,
    ),
  );
}

try {
  if (cmd === "verify") await verify();
  else if (cmd === "seed-seo") await seedSeo();
  else if (cmd === "indexing-off") await setIndexing(process.argv[3]!, false);
  else if (cmd === "indexing-on") await setIndexing(process.argv[3]!, true);
  else if (cmd === "paths") await listPublicPaths(process.argv[3]!);
  else if (cmd === "seed-cms") await seedCmsPage(process.argv[3]!);
  else if (cmd === "seed-marketing") await seedMarketing(process.argv[3]!);
  else {
    console.error("unknown command", cmd);
    process.exit(1);
  }
} finally {
  await sql.end({ timeout: 5 });
}
