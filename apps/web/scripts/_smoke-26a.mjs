/**
 * Local smoke for Etapa 26A (no secrets). Run while `pnpm dev` is up.
 */
const checks = [
  {
    name: "apex landing",
    host: "localhost:3000",
    path: "/",
    expectStatus: 200,
    must: [/saas-marketing/, /data-plan-code="plan_50"/, /Contactează-ne|Contacteaz/],
    mustNot: [/Vehicule disponibile/, /data-catalog-view/],
  },
  {
    name: "apex /preturi",
    host: "localhost:3000",
    path: "/preturi",
    expectStatus: 200,
    must: [/data-plan-code="premium"/, /599 lei/, /Preț negociat|Pret negociat/],
    mustNot: [/Vehicule disponibile/],
  },
  {
    name: "ACME catalog",
    host: "acme.localhost:3000",
    path: "/",
    expectStatus: 200,
    must: [/Vehicule disponibile/, /mașini în stoc|masini in stoc/i],
    mustNot: [/data-plan-code="plan_50"/, /saas-marketing/],
  },
  {
    name: "ACME /preturi denied",
    host: "acme.localhost:3000",
    path: "/preturi",
    expectStatus: 404,
    must: [],
    mustNot: [],
  },
  {
    name: "Golf archived 404",
    host: "acme.localhost:3000",
    path: "/vehicles/golf-8-acme",
    expectStatus: 404,
    must: [],
    mustNot: [],
  },
  {
    name: "Beta catalog isolated",
    host: "beta.localhost:3000",
    path: "/",
    expectStatus: 200,
    must: [/Vehicule disponibile/],
    mustNot: [
      /data-plan-code="plan_50"/,
      /bmw-seria-5-m-sport/,
      /koenigsegg-ccx/,
      /saas-marketing/,
    ],
  },
];

async function fetchHost(host, path) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 25000);
  try {
    const res = await fetch(`http://127.0.0.1:3000${path}`, {
      headers: { Host: host, "x-forwarded-host": host },
      signal: ctrl.signal,
      redirect: "manual",
    });
    const text = await res.text();
    return { status: res.status, text };
  } finally {
    clearTimeout(t);
  }
}

let failed = 0;
for (const c of checks) {
  try {
    const { status, text } = await fetchHost(c.host, c.path);
    const problems = [];
    if (status !== c.expectStatus) {
      problems.push(`status ${status} !== ${c.expectStatus}`);
    }
    for (const re of c.must) {
      if (!re.test(text)) problems.push(`missing ${re}`);
    }
    for (const re of c.mustNot) {
      if (re.test(text)) problems.push(`forbidden hit ${re}`);
    }
    if (problems.length) {
      failed += 1;
      console.log(`FAIL ${c.name}: ${problems.join("; ")}`);
    } else {
      console.log(`OK   ${c.name} (${status}, ${text.length}b)`);
    }
  } catch (err) {
    failed += 1;
    console.log(`FAIL ${c.name}: ${err?.name || err} ${err?.message || ""}`);
  }
}

// Hobby fail-closed is unit-covered; assert local apex has no demo slug header path.
console.log(
  "NOTE Hobby apex catalog: unit-tested fail-closed without HOBBY_DEMO_APEX_CATALOG (default off)",
);

process.exit(failed ? 1 : 0);
