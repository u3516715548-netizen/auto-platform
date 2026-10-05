"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { VehicleBodyType, VehicleFuel } from "@auto-platform/types";
import {
  buildCatalogHref,
  type CatalogQuery,
} from "@/lib/storefront/catalog-query";
import {
  IconBattery,
  IconBolt,
  IconCloud,
  IconConvertible,
  IconCoupe,
  IconDrop,
  IconEstate,
  IconFlame,
  IconHatchback,
  IconLeaf,
  IconMpv,
  IconPickup,
  IconSearch,
  IconSedan,
  IconSuv,
  IconVan,
} from "@/components/storefront/icons";

export type QuickSheetKind = "brand" | "body" | "fuel" | "price" | "year";

type CatalogQuickSheetProps = {
  kind: QuickSheetKind;
  query: CatalogQuery;
  brands: string[];
  priceCeiling: number;
  yearFloor: number;
  yearCeiling: number;
  onClose: () => void;
};

const BODY_OPTIONS: Array<{
  value: VehicleBodyType;
  label: string;
  Icon: (p: { size?: number }) => ReactNode;
}> = [
  { value: "sedan", label: "Sedan", Icon: IconSedan },
  { value: "suv", label: "SUV", Icon: IconSuv },
  { value: "estate", label: "Combi", Icon: IconEstate },
  { value: "coupe", label: "Coupe", Icon: IconCoupe },
  { value: "convertible", label: "Cabrio", Icon: IconConvertible },
  { value: "hatchback", label: "Compactă", Icon: IconHatchback },
  { value: "mpv", label: "Minivan", Icon: IconMpv },
  { value: "pickup", label: "Pick-up", Icon: IconPickup },
  { value: "van", label: "Dubă", Icon: IconVan },
  { value: "other", label: "Altă", Icon: IconSedan },
];

const FUEL_OPTIONS: Array<{
  value: VehicleFuel;
  label: string;
  color: string;
  Icon: (p: { size?: number }) => ReactNode;
}> = [
  { value: "petrol", label: "Benzină", color: "#ef4444", Icon: IconFlame },
  { value: "diesel", label: "Diesel", color: "#71717a", Icon: IconDrop },
  { value: "electric", label: "Electric", color: "#3b82f6", Icon: IconBolt },
  { value: "hybrid", label: "Hibrid", color: "#22c55e", Icon: IconLeaf },
  {
    value: "plugin_hybrid",
    label: "Hibrid Plug-in",
    color: "#14b8a6",
    Icon: IconBattery,
  },
  { value: "lpg", label: "Benzină + GPL", color: "#f59e0b", Icon: IconFlame },
  { value: "cng", label: "Benzină + CNG", color: "#64748b", Icon: IconCloud },
  { value: "other", label: "Altul", color: "#a1a1aa", Icon: IconDrop },
];

const PRICE_PRESETS = [
  { label: "Tot", max: null },
  { label: "< €10k", max: 10_000 },
  { label: "< €15k", max: 15_000 },
  { label: "< €25k", max: 25_000 },
  { label: "< €40k", max: 40_000 },
  { label: "< €60k", max: 60_000 },
] as const;

const YEAR_PRESETS = [
  { label: "Tot", min: null },
  { label: "din 2022", min: 2022 },
  { label: "din 2020", min: 2020 },
  { label: "din 2018", min: 2018 },
  { label: "din 2015", min: 2015 },
  { label: "din 2010", min: 2010 },
] as const;

function formatEur(n: number): string {
  return new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

/**
 * Dedicated bottom sheets for Brand / Caroserie / Combustibil / Preț / An.
 * Only the selected filter is shown — Continuă applies and closes.
 */
export function CatalogQuickSheet({
  kind,
  query,
  brands,
  priceCeiling,
  yearFloor,
  yearCeiling,
  onClose,
}: CatalogQuickSheetProps) {
  const router = useRouter();
  const [brandSearch, setBrandSearch] = useState("");
  const [selectedMakes, setSelectedMakes] = useState<string[]>(query.make);
  const [selectedBodies, setSelectedBodies] = useState<VehicleBodyType[]>(query.bodyType);
  const [selectedFuels, setSelectedFuels] = useState<VehicleFuel[]>(query.fuel);
  const [priceMin, setPriceMin] = useState(query.priceMin ?? 0);
  const [priceMax, setPriceMax] = useState(query.priceMax ?? priceCeiling);
  const [yearMin, setYearMin] = useState(query.yearMin ?? yearFloor);
  const [yearMax, setYearMax] = useState(query.yearMax ?? yearCeiling);

  const filteredBrands = useMemo(() => {
    const q = brandSearch.trim().toLowerCase();
    if (!q) return brands;
    return brands.filter((b) => b.toLowerCase().includes(q));
  }, [brands, brandSearch]);

  const title =
    kind === "brand"
      ? "Brand"
      : kind === "body"
        ? "Caroserie"
        : kind === "fuel"
          ? "Combustibil"
          : kind === "price"
            ? "Preț"
            : "An";

  const subtitle =
    kind === "price"
      ? "Setează intervalul de preț"
      : kind === "year"
        ? "Setează intervalul anilor"
        : "Alege unul sau mai multe";

  function apply(next: CatalogQuery) {
    router.push(buildCatalogHref({ ...next, page: 1 }));
    onClose();
  }

  function onContinue() {
    if (kind === "brand") {
      apply({ ...query, make: selectedMakes, q: null });
      return;
    }
    if (kind === "body") {
      apply({ ...query, bodyType: selectedBodies });
      return;
    }
    if (kind === "fuel") {
      apply({ ...query, fuel: selectedFuels });
      return;
    }
    if (kind === "price") {
      const min = priceMin <= 0 ? null : priceMin;
      const max = priceMax >= priceCeiling ? null : priceMax;
      apply({ ...query, priceMin: min, priceMax: max });
      return;
    }
    const ymin = yearMin <= yearFloor ? null : yearMin;
    const ymax = yearMax >= yearCeiling ? null : yearMax;
    apply({ ...query, yearMin: ymin, yearMax: ymax });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-zinc-900/45"
        aria-label="Închide"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-10 flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-[var(--sf-border)] bg-white shadow-xl"
      >
        <div className="flex shrink-0 flex-col items-center px-4 pt-3 pb-2">
          <span className="mb-3 h-1 w-10 rounded-full bg-zinc-300" aria-hidden />
          <h2 className="w-full text-2xl font-bold tracking-tight text-[var(--sf-text)]">
            {title}
          </h2>
          <p className="mt-1 w-full text-sm text-[var(--sf-text-muted)]">{subtitle}</p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
          {kind === "brand" ? (
            <BrandSheet
              search={brandSearch}
              setSearch={setBrandSearch}
              brands={filteredBrands}
              selected={selectedMakes}
              setSelected={setSelectedMakes}
            />
          ) : null}
          {kind === "body" ? (
            <BodySheet selected={selectedBodies} setSelected={setSelectedBodies} />
          ) : null}
          {kind === "fuel" ? (
            <FuelSheet selected={selectedFuels} setSelected={setSelectedFuels} />
          ) : null}
          {kind === "price" ? (
            <PriceSheet
              ceiling={priceCeiling}
              priceMin={priceMin}
              priceMax={priceMax}
              setPriceMin={setPriceMin}
              setPriceMax={setPriceMax}
            />
          ) : null}
          {kind === "year" ? (
            <YearSheet
              floor={yearFloor}
              ceiling={yearCeiling}
              yearMin={yearMin}
              yearMax={yearMax}
              setYearMin={setYearMin}
              setYearMax={setYearMax}
            />
          ) : null}
        </div>

        <div
          className="shrink-0 border-t border-[var(--sf-border)] bg-white px-4 pt-3"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <button
            type="button"
            onClick={onContinue}
            className="inline-flex min-h-13 w-full items-center justify-center rounded-2xl text-base font-bold text-white"
            style={{
              backgroundImage:
                "linear-gradient(90deg, color-mix(in srgb, var(--sf-accent) 88%, #7f1d1d), var(--sf-accent))",
            }}
          >
            Continuă
          </button>
        </div>
      </div>
    </div>
  );
}

function BrandSheet({
  search,
  setSearch,
  brands,
  selected,
  setSelected,
}: {
  search: string;
  setSearch: (v: string) => void;
  brands: string[];
  selected: string[];
  setSelected: (v: string[]) => void;
}) {
  function toggle(brand: string) {
    const key = brand.toLowerCase();
    if (selected.some((s) => s.toLowerCase() === key)) {
      setSelected(selected.filter((s) => s.toLowerCase() !== key));
    } else {
      setSelected([...selected, brand]);
    }
  }

  return (
    <div className="flex flex-col gap-3 pt-2">
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[var(--sf-text-muted)]">
          <IconSearch size={18} />
        </span>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Caută marca..."
          className="min-h-12 w-full rounded-full border border-[var(--sf-border)] bg-[var(--sf-surface-muted)] py-2.5 pr-3 pl-11 text-sm outline-none focus:border-[var(--sf-accent)] focus:bg-white"
        />
      </div>
      <ul className="flex flex-col gap-2">
        {brands.map((brand) => {
          const on = selected.some((s) => s.toLowerCase() === brand.toLowerCase());
          const initial = brand.trim().charAt(0).toUpperCase() || "?";
          return (
            <li key={brand}>
              <button
                type="button"
                onClick={() => toggle(brand)}
                aria-pressed={on}
                className={`flex min-h-14 w-full items-center gap-3 rounded-2xl border px-3 text-left ${
                  on
                    ? "border-[var(--sf-accent)] bg-[color-mix(in_srgb,var(--sf-accent)_8%,white)]"
                    : "border-[var(--sf-border)] bg-[var(--sf-surface-muted)]"
                }`}
              >
                <span
                  className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-sm font-bold text-[var(--sf-text)]"
                  aria-hidden
                >
                  {initial}
                </span>
                <span className="text-base font-semibold text-[var(--sf-text)]">{brand}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {brands.length === 0 ? (
        <p className="py-6 text-center text-sm text-[var(--sf-text-muted)]">Nicio marcă găsită.</p>
      ) : null}
    </div>
  );
}

function BodySheet({
  selected,
  setSelected,
}: {
  selected: VehicleBodyType[];
  setSelected: (v: VehicleBodyType[]) => void;
}) {
  function toggle(value: VehicleBodyType) {
    if (selected.includes(value)) {
      setSelected(selected.filter((v) => v !== value));
    } else {
      setSelected([...selected, value]);
    }
  }

  return (
    <ul className="grid grid-cols-3 gap-2.5 pt-2">
      {BODY_OPTIONS.map(({ value, label, Icon }) => {
        const on = selected.includes(value);
        return (
          <li key={value}>
            <button
              type="button"
              onClick={() => toggle(value)}
              aria-pressed={on}
              className={`flex min-h-[6.5rem] w-full flex-col items-center justify-center gap-2 rounded-2xl border px-2 py-3 ${
                on
                  ? "border-[var(--sf-accent)] bg-[color-mix(in_srgb,var(--sf-accent)_8%,white)]"
                  : "border-[var(--sf-border)] bg-[var(--sf-surface-muted)]"
              }`}
            >
              <span
                className="relative inline-flex size-12 items-center justify-center text-[var(--sf-text)]"
                aria-hidden
              >
                <span
                  className="absolute inset-0 rounded-full opacity-25"
                  style={{
                    background:
                      "radial-gradient(circle, color-mix(in srgb, var(--sf-accent) 55%, transparent), transparent 70%)",
                  }}
                />
                <Icon size={28} />
              </span>
              <span className="text-center text-xs font-bold leading-tight text-[var(--sf-text)]">
                {label}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function FuelSheet({
  selected,
  setSelected,
}: {
  selected: VehicleFuel[];
  setSelected: (v: VehicleFuel[]) => void;
}) {
  function toggle(value: VehicleFuel) {
    if (selected.includes(value)) {
      setSelected(selected.filter((v) => v !== value));
    } else {
      setSelected([...selected, value]);
    }
  }

  return (
    <ul className="grid grid-cols-2 gap-2.5 pt-2">
      {FUEL_OPTIONS.map(({ value, label, color, Icon }) => {
        const on = selected.includes(value);
        return (
          <li key={value}>
            <button
              type="button"
              onClick={() => toggle(value)}
              aria-pressed={on}
              className={`flex min-h-[6.75rem] w-full flex-col items-center justify-center gap-2.5 rounded-2xl border px-3 py-4 ${
                on
                  ? "border-[var(--sf-accent)] bg-[color-mix(in_srgb,var(--sf-accent)_8%,white)]"
                  : "border-[var(--sf-border)] bg-[var(--sf-surface-muted)]"
              }`}
            >
              <span
                className="inline-flex size-11 items-center justify-center rounded-full text-white"
                style={{ backgroundColor: color }}
                aria-hidden
              >
                <Icon size={20} />
              </span>
              <span className="text-center text-sm font-bold text-[var(--sf-text)]">{label}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function PriceSheet({
  ceiling,
  priceMin,
  priceMax,
  setPriceMin,
  setPriceMax,
}: {
  ceiling: number;
  priceMin: number;
  priceMax: number;
  setPriceMin: (n: number) => void;
  setPriceMax: (n: number) => void;
}) {
  const activePreset =
    PRICE_PRESETS.find((p) => {
      if (p.max === null) return priceMin <= 0 && priceMax >= ceiling;
      return priceMin <= 0 && priceMax === p.max;
    })?.label ?? null;

  return (
    <div className="flex flex-col gap-5 pt-2">
      <div>
        <p className="mb-2 text-[11px] font-semibold tracking-wide text-[var(--sf-text-muted)] uppercase">
          Presetări buget
        </p>
        <div className="flex flex-wrap gap-2">
          {PRICE_PRESETS.map((preset) => {
            const on = activePreset === preset.label;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  setPriceMin(0);
                  setPriceMax(preset.max ?? ceiling);
                }}
                className={`min-h-10 rounded-full px-3.5 text-sm font-semibold ${
                  on ? "text-white" : "border border-[var(--sf-border)] bg-[var(--sf-surface-muted)]"
                }`}
                style={on ? { backgroundColor: "var(--sf-accent)" } : undefined}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      <RangeBlock
        label="Preț minim"
        valueLabel={formatEur(priceMin)}
        min={0}
        max={ceiling}
        value={priceMin}
        onChange={(n) => setPriceMin(Math.min(n, priceMax))}
        edgeLabels={[formatEur(0), formatEur(ceiling)]}
      />
      <RangeBlock
        label="Preț maxim"
        valueLabel={formatEur(priceMax)}
        min={0}
        max={ceiling}
        value={priceMax}
        onChange={(n) => setPriceMax(Math.max(n, priceMin))}
        edgeLabels={[formatEur(0), formatEur(ceiling)]}
      />
    </div>
  );
}

function YearSheet({
  floor,
  ceiling,
  yearMin,
  yearMax,
  setYearMin,
  setYearMax,
}: {
  floor: number;
  ceiling: number;
  yearMin: number;
  yearMax: number;
  setYearMin: (n: number) => void;
  setYearMax: (n: number) => void;
}) {
  const activePreset =
    YEAR_PRESETS.find((p) => {
      if (p.min === null) return yearMin <= floor && yearMax >= ceiling;
      return yearMin === p.min && yearMax >= ceiling;
    })?.label ?? null;

  return (
    <div className="flex flex-col gap-5 pt-2">
      <div>
        <p className="mb-2 text-[11px] font-semibold tracking-wide text-[var(--sf-text-muted)] uppercase">
          Presetări an minim
        </p>
        <div className="flex flex-wrap gap-2">
          {YEAR_PRESETS.map((preset) => {
            const on = activePreset === preset.label;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  setYearMin(preset.min ?? floor);
                  setYearMax(ceiling);
                }}
                className={`min-h-10 rounded-full px-3.5 text-sm font-semibold ${
                  on ? "text-white" : "border border-[var(--sf-border)] bg-[var(--sf-surface-muted)]"
                }`}
                style={on ? { backgroundColor: "var(--sf-accent)" } : undefined}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      <RangeBlock
        label="An minim"
        valueLabel={String(yearMin)}
        min={floor}
        max={ceiling}
        value={yearMin}
        onChange={(n) => setYearMin(Math.min(n, yearMax))}
        edgeLabels={[String(floor), String(ceiling)]}
      />
      <RangeBlock
        label="An maxim"
        valueLabel={String(yearMax)}
        min={floor}
        max={ceiling}
        value={yearMax}
        onChange={(n) => setYearMax(Math.max(n, yearMin))}
        edgeLabels={[String(floor), String(ceiling)]}
      />
    </div>
  );
}

function RangeBlock({
  label,
  valueLabel,
  min,
  max,
  value,
  onChange,
  edgeLabels,
}: {
  label: string;
  valueLabel: string;
  min: number;
  max: number;
  value: number;
  onChange: (n: number) => void;
  edgeLabels: [string, string];
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="text-[11px] font-semibold tracking-wide text-[var(--sf-text-muted)] uppercase">
          {label}
        </p>
        <p className="text-base font-bold text-[var(--sf-text)]">{valueLabel}</p>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--sf-accent)]"
      />
      <div className="mt-1 flex justify-between text-xs text-[var(--sf-text-muted)]">
        <span>{edgeLabels[0]}</span>
        <span>{edgeLabels[1]}</span>
      </div>
    </div>
  );
}
