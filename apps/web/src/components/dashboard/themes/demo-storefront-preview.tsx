"use client";

import { useMemo, useState } from "react";
import {
  DEMO_DEALER,
  DEMO_VEHICLES,
  demoVehicleToDetailDto,
  filterDemoVehicles,
  findDemoVehicle,
  listDemoCatalogDtos,
  listDemoVehicleAlternatives,
  type DemoVehicle,
} from "@/lib/storefront/demo/demo-storefront-data";
import { STOREFRONT_CONTACT_ANCHOR_ID } from "@/lib/storefront/storefront-contact-links";
import { resolveStorefrontShellClass } from "@/lib/storefront/storefront-shell-helpers";
import type { StorefrontTemplateDefinition } from "@/lib/storefront/templates/registry";
import { StorefrontListsProvider } from "@/components/storefront/storefront-lists-context";
import { PublicVehicleDetail } from "@/components/storefront/public-vehicle-detail";
import { PublicVehicleList } from "@/components/storefront/public-vehicle-list";
import { PublicLeadForm } from "@/components/storefront/public-lead-form";
import { VehicleAlternativesCarousel } from "@/components/storefront/vehicle-alternatives-carousel";
import { VehicleSaveHeaderButton } from "@/components/storefront/vehicle-list-actions";
import { CompareFloatingBar } from "@/components/storefront/compare-floating-bar";
import { toStorefrontVehicleLite } from "@/lib/storefront/storefront-vehicle-lite";
import {
  IconBody,
  IconBookmark,
  IconCar,
  IconChevronLeft,
  IconCompare,
  IconFuel,
  IconGrid,
  IconHome,
  IconPhone,
  IconSearch,
  IconSort,
  IconTag,
} from "@/components/storefront/icons";

type DemoView = { kind: "catalog" } | { kind: "detail"; slug: string };

type DemoStorefrontPreviewProps = {
  template: StorefrontTemplateDefinition;
  viewport: "desktop" | "mobile";
};

/**
 * Client-only Template 1 / 2 demo storefront for theme preview.
 * Reuses live Template 1 components (cards, detail, compare bar, alternatives).
 * No Supabase, no tenant inventory, leads disabled (no DB writes).
 */
export function DemoStorefrontPreview({ template, viewport }: DemoStorefrontPreviewProps) {
  const [view, setView] = useState<DemoView>({ kind: "catalog" });
  const [query, setQuery] = useState("");

  const vehicles = useMemo(() => listDemoCatalogDtos(query), [query]);
  const shellClass = resolveStorefrontShellClass(template.id);
  const isMobile = viewport === "mobile";

  return (
    <StorefrontListsProvider tenantSlug={DEMO_DEALER.slug}>
      <div
        className={`${shellClass} flex h-full min-h-0 flex-col overflow-hidden text-[var(--sf-text,#18181b)]`}
        data-storefront-template={template.id}
        data-demo-preview="true"
        style={{ ["--sf-accent" as string]: DEMO_DEALER.accentColor }}
      >
        <div className="sf-canvas relative mx-auto flex h-full min-h-0 w-full max-w-[1200px] flex-col md:shadow-[0_0_0_1px_rgba(24,24,27,0.06)]">
          <header className="sticky top-0 z-30 shrink-0 border-b border-[var(--sf-border,#e4e4e7)] bg-white/90 backdrop-blur-md">
            <div className="flex items-center justify-between gap-3 px-3 py-2.5 md:px-8 md:py-3">
              <div className="flex min-w-0 items-center gap-3 md:gap-5">
                <button
                  type="button"
                  className="min-w-0 text-left"
                  onClick={() => setView({ kind: "catalog" })}
                >
                  <span className="block truncate text-base font-semibold tracking-tight text-[var(--sf-text)] md:text-lg">
                    {DEMO_DEALER.name}
                  </span>
                </button>
                {!isMobile ? (
                  <nav aria-label="Navigare demo" className="hidden items-center gap-1 md:flex">
                    <span className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold">
                      <IconCar size={16} />
                      Mașini
                    </span>
                    <span className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-[var(--sf-text-muted,#71717a)]">
                      <IconBookmark size={16} />
                      Salvate
                    </span>
                    <span className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-[var(--sf-text-muted,#71717a)]">
                      <IconCompare size={16} />
                      Compară
                    </span>
                  </nav>
                ) : null}
              </div>
              <span
                className="inline-flex min-h-9 shrink-0 items-center rounded-full px-3.5 text-sm font-bold text-white"
                style={{ backgroundColor: "var(--sf-accent)" }}
              >
                Sună
              </span>
            </div>
          </header>

          <div
            className={`min-h-0 flex-1 overflow-y-auto overscroll-contain ${isMobile && view.kind === "catalog" ? "pb-16" : ""}`}
          >
            {view.kind === "catalog" ? (
              <CatalogView
                vehicles={vehicles}
                query={query}
                setQuery={setQuery}
                onOpen={(slug) => setView({ kind: "detail", slug })}
              />
            ) : (
              <DetailView
                vehicle={findDemoVehicle(view.slug)}
                onBack={() => setView({ kind: "catalog" })}
                onOpen={(slug) => setView({ kind: "detail", slug })}
              />
            )}
          </div>

          {isMobile && view.kind === "catalog" ? (
            <nav
              aria-label="Navigare mobil demo"
              className="shrink-0 border-t border-[var(--sf-border,#e4e4e7)] bg-white px-1 py-1"
            >
              <ul className="flex justify-around text-[10px] font-semibold text-[var(--sf-text-muted,#71717a)]">
                <li className="flex min-h-12 flex-col items-center justify-center gap-0.5 px-1">
                  <IconHome size={18} />
                  Acasă
                </li>
                <li>
                  <button
                    type="button"
                    className="flex min-h-12 flex-col items-center justify-center gap-0.5 px-1 text-[var(--sf-text)]"
                    onClick={() => setView({ kind: "catalog" })}
                  >
                    <IconCar size={18} />
                    Mașini
                  </button>
                </li>
                <li className="flex min-h-12 flex-col items-center justify-center gap-0.5 px-1">
                  <IconBookmark size={18} />
                  Salvate
                </li>
                <li className="flex min-h-12 flex-col items-center justify-center gap-0.5 px-1">
                  <IconCompare size={18} />
                  Compară
                </li>
                <li className="flex min-h-12 flex-col items-center justify-center gap-0.5 px-1">
                  <IconPhone size={18} />
                  Sună
                </li>
              </ul>
            </nav>
          ) : null}

          <CompareFloatingBar embedded disableNavigation />
        </div>
      </div>
    </StorefrontListsProvider>
  );
}

function CatalogView({
  vehicles,
  query,
  setQuery,
  onOpen,
}: {
  vehicles: ReturnType<typeof listDemoCatalogDtos>;
  query: string;
  setQuery: (q: string) => void;
  onOpen: (slug: string) => void;
}) {
  const count = filterDemoVehicles(query).length;

  return (
    <div className="sf-glow-ambient flex flex-col gap-4 px-3 py-3 md:px-8 md:py-6">
      <div className="sf-solid-card flex flex-col gap-3 rounded-2xl border border-[var(--sf-border,#e4e4e7)] p-3 md:gap-4 md:p-5">
        <div className="flex rounded-full bg-[var(--sf-surface-muted,#f4f4f5)] p-1 md:max-w-md">
          <span className="inline-flex min-h-10 flex-1 items-center justify-center rounded-full bg-[var(--sf-surface,#fff)] px-3 text-sm font-semibold shadow-sm">
            În stoc
          </span>
          <span className="inline-flex min-h-10 flex-1 items-center justify-center rounded-full px-3 text-sm font-medium text-[var(--sf-text-muted,#71717a)]">
            Urmează în stoc
          </span>
        </div>
        <label className="relative block">
          <span className="sr-only">Caută marca sau modelul</span>
          <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[var(--sf-text-muted,#71717a)]">
            <IconSearch size={18} />
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Caută marca sau modelul..."
            className="min-h-12 w-full rounded-2xl border border-[var(--sf-border,#e4e4e7)] bg-[var(--sf-surface-muted,#f4f4f5)] py-2.5 pr-3 pl-11 text-sm outline-none focus:border-[var(--sf-accent)] focus:bg-white focus:ring-2 focus:ring-[color-mix(in_srgb,var(--sf-accent)_25%,transparent)]"
          />
        </label>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-3">
          <span className="sf-pill col-span-2 md:col-span-1">Brand</span>
          <span className="sf-pill gap-2">
            <IconBody size={16} />
            Caroserie
          </span>
          <span className="sf-pill gap-2">
            <IconFuel size={16} />
            Combustibil
          </span>
          <span className="sf-pill gap-2">
            <IconTag size={16} />
            Preț
          </span>
          <span className="sf-pill">An</span>
          <span
            className="col-span-2 inline-flex min-h-12 items-center justify-center rounded-2xl text-sm font-bold text-white md:col-span-1"
            style={{ backgroundColor: "var(--sf-accent)" }}
          >
            Toate filtrele
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-lg font-bold tracking-tight text-[var(--sf-text)]">
            {count === 1 ? "1 mașină" : `${count} mașini`}
          </p>
          <p className="text-sm text-[var(--sf-text-muted,#71717a)]">în stoc · date demo</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span
            className="inline-flex size-10 items-center justify-center rounded-xl border border-[var(--sf-border,#e4e4e7)] bg-white text-[var(--sf-text-muted,#71717a)]"
            aria-hidden
          >
            <IconGrid size={16} />
          </span>
          <span className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[var(--sf-border,#e4e4e7)] bg-white px-2.5 text-xs font-semibold">
            <IconBookmark size={14} />
            Salvează
          </span>
          <span
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[var(--sf-border,#e4e4e7)] bg-white px-2.5 text-xs font-semibold"
            style={{ color: "var(--sf-accent)" }}
          >
            <IconSort size={14} />
            Recente
          </span>
        </div>
      </div>

      <PublicVehicleList vehicles={vehicles} onSelectSlug={onOpen} />

      {vehicles.length === 0 ? (
        <div className="rounded-[var(--sf-radius-lg,1rem)] border border-dashed border-[var(--sf-border,#e4e4e7)] bg-white px-4 py-10 text-center">
          <p className="text-base font-medium text-[var(--sf-text)]">
            Niciun vehicul demo nu corespunde căutării.
          </p>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Same structure as public /vehicles/[slug]: back + PublicVehicleDetail + lead + Alte alternative.
 */
function DetailView({
  vehicle,
  onBack,
  onOpen,
}: {
  vehicle: DemoVehicle | undefined;
  onBack: () => void;
  onOpen: (slug: string) => void;
}) {
  if (!vehicle) {
    return (
      <div className="p-4">
        <button
          type="button"
          className="text-sm font-semibold"
          style={{ color: "var(--sf-accent)" }}
          onClick={onBack}
        >
          ← Înapoi la catalog
        </button>
        <p className="mt-4 text-sm text-zinc-600">Vehicul demo negăsit.</p>
      </div>
    );
  }

  const detail = demoVehicleToDetailDto(vehicle);
  const cover = detail.images[0] ?? null;
  const lite = toStorefrontVehicleLite({
    ...detail,
    coverImage: cover ? { url: cover.url, altText: cover.altText } : null,
  });
  const alternatives = listDemoVehicleAlternatives(vehicle.slug, 8);

  return (
    <div className="sf-glow-ambient flex w-full min-w-0 flex-col gap-6 px-3 py-3 sm:gap-8 md:px-8 md:py-6">
      <div className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-6 sm:gap-8">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-10 items-center gap-1 rounded-full border border-[var(--sf-border)] bg-white px-3 text-sm font-semibold text-[var(--sf-text)]"
          >
            <IconChevronLeft size={16} />
            Înapoi
          </button>
          <p className="min-w-0 truncate text-center text-sm font-bold text-[var(--sf-text)]">
            {vehicle.make} {vehicle.model}
          </p>
          <VehicleSaveHeaderButton vehicle={lite} />
        </div>

        <PublicVehicleDetail
          vehicle={detail}
          images={detail.images}
          accent={DEMO_DEALER.accentColor}
          leadsEnabled={false}
        />

        <section
          id={STOREFRONT_CONTACT_ANCHOR_ID}
          aria-labelledby="lead-form-heading"
          className="scroll-mt-28 rounded-[var(--sf-radius-lg)] border border-[var(--sf-border)] bg-white p-4 sm:p-5"
        >
          <PublicLeadForm
            vehicleSlug={vehicle.slug}
            accent={DEMO_DEALER.accentColor}
            disabled
            disabledMessage="Contactul online este dezactivat în preview-ul demo (fără lead-uri, fără scriere în DB)."
          />
        </section>
      </div>

      {alternatives.length > 0 ? (
        <div className="mx-auto w-full min-w-0 max-w-6xl">
          <VehicleAlternativesCarousel vehicles={alternatives} onSelectSlug={onOpen} />
        </div>
      ) : null}

      <p className="pb-2 text-center text-xs text-[var(--sf-text-muted)]">
        Detaliu demo — {DEMO_VEHICLES.length} vehicule în catalogul de previzualizare.
      </p>
    </div>
  );
}
