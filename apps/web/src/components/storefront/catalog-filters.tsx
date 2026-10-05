import Link from "next/link";
import {
  CATALOG_SORT_LABELS_RO,
  CATALOG_SORT_VALUES,
  type CatalogQuery,
} from "@/lib/storefront/catalog-query";
import {
  catalogQueryHasFilterChips,
  resetCatalogHref,
} from "@/lib/storefront/catalog-chips";
import {
  VEHICLE_BODY_TYPE_LABELS_RO,
  VEHICLE_FUEL_LABELS_RO,
  VEHICLE_TRANSMISSION_LABELS_RO,
  enumOptions,
} from "@/lib/vehicles/vehicle-field-labels";

type CatalogFiltersProps = {
  query: CatalogQuery;
  /** Prefix for label/input ids so desktop + mobile never collide. */
  idPrefix: string;
  submitLabel: string;
  className?: string;
  /** Show Reset → `/` when filters are active (drawer). */
  showReset?: boolean;
};

const inputClass =
  "min-h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30";

const checkboxLabelClass =
  "flex min-h-11 items-center gap-2.5 text-sm text-zinc-800";

const checkboxClass =
  "size-5 shrink-0 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";

export function CatalogFilters({
  query,
  idPrefix,
  submitLabel,
  className,
  showReset = false,
}: CatalogFiltersProps) {
  const fuelOptions = enumOptions(VEHICLE_FUEL_LABELS_RO);
  const transmissionOptions = enumOptions(VEHICLE_TRANSMISSION_LABELS_RO);
  const bodyOptions = enumOptions(VEHICLE_BODY_TYPE_LABELS_RO);
  const hasFilters = catalogQueryHasFilterChips(query);
  const id = (name: string) => `${idPrefix}-${name}`;

  return (
    <form
      method="GET"
      action="/"
      className={
        className ??
        "flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 sm:p-5"
      }
    >
      {/* Changing filters always starts at page 1 — do not submit page. */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-3">
          <label htmlFor={id("q")} className="text-sm font-medium text-zinc-800">
            Căutare
          </label>
          <input
            id={id("q")}
            name="q"
            type="search"
            defaultValue={query.q ?? ""}
            maxLength={80}
            placeholder="Caută marcă sau model"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={id("priceMin")} className="text-sm font-medium text-zinc-800">
            Preț de
          </label>
          <input
            id={id("priceMin")}
            name="priceMin"
            type="number"
            inputMode="numeric"
            min={0}
            max={2_000_000}
            defaultValue={query.priceMin ?? ""}
            placeholder="EUR"
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={id("priceMax")} className="text-sm font-medium text-zinc-800">
            Preț până la
          </label>
          <input
            id={id("priceMax")}
            name="priceMax"
            type="number"
            inputMode="numeric"
            min={0}
            max={2_000_000}
            defaultValue={query.priceMax ?? ""}
            placeholder="EUR"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={id("yearMin")} className="text-sm font-medium text-zinc-800">
            An de
          </label>
          <input
            id={id("yearMin")}
            name="yearMin"
            type="number"
            inputMode="numeric"
            min={1950}
            max={2100}
            defaultValue={query.yearMin ?? ""}
            placeholder="2015"
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={id("yearMax")} className="text-sm font-medium text-zinc-800">
            An până la
          </label>
          <input
            id={id("yearMax")}
            name="yearMax"
            type="number"
            inputMode="numeric"
            min={1950}
            max={2100}
            defaultValue={query.yearMax ?? ""}
            placeholder="2024"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={id("kmMin")} className="text-sm font-medium text-zinc-800">
            Km de
          </label>
          <input
            id={id("kmMin")}
            name="kmMin"
            type="number"
            inputMode="numeric"
            min={0}
            max={2_000_000}
            defaultValue={query.kmMin ?? ""}
            placeholder="0"
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={id("kmMax")} className="text-sm font-medium text-zinc-800">
            Km până la
          </label>
          <input
            id={id("kmMax")}
            name="kmMax"
            type="number"
            inputMode="numeric"
            min={0}
            max={2_000_000}
            defaultValue={query.kmMax ?? ""}
            placeholder="150 000"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-1">
          <label htmlFor={id("sort")} className="text-sm font-medium text-zinc-800">
            Sortare
          </label>
          <select
            id={id("sort")}
            name="sort"
            defaultValue={query.sort}
            className={inputClass}
          >
            {CATALOG_SORT_VALUES.map((value) => (
              <option key={value} value={value}>
                {CATALOG_SORT_LABELS_RO[value]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <fieldset className="rounded-xl border border-zinc-200 bg-white p-3">
        <legend className="px-1 text-sm font-medium text-zinc-800">Combustibil</legend>
        <div className="mt-2 grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-4">
          {fuelOptions.map((opt) => (
            <label key={opt.value} className={checkboxLabelClass}>
              <input
                type="checkbox"
                name="fuel"
                value={opt.value}
                defaultChecked={query.fuel.includes(opt.value)}
                className={checkboxClass}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="rounded-xl border border-zinc-200 bg-white p-3">
        <legend className="px-1 text-sm font-medium text-zinc-800">Transmisie</legend>
        <div className="mt-2 grid grid-cols-2 gap-1 sm:grid-cols-3">
          {transmissionOptions.map((opt) => (
            <label key={opt.value} className={checkboxLabelClass}>
              <input
                type="checkbox"
                name="transmission"
                value={opt.value}
                defaultChecked={query.transmission.includes(opt.value)}
                className={checkboxClass}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="rounded-xl border border-zinc-200 bg-white p-3">
        <legend className="px-1 text-sm font-medium text-zinc-800">Caroserie</legend>
        <div className="mt-2 grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-4">
          {bodyOptions.map((opt) => (
            <label key={opt.value} className={checkboxLabelClass}>
              <input
                type="checkbox"
                name="bodyType"
                value={opt.value}
                defaultChecked={query.bodyType.includes(opt.value)}
                className={checkboxClass}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <button
          type="submit"
          className="inline-flex min-h-11 flex-1 items-center justify-center rounded-[var(--sf-radius)] bg-[var(--sf-accent,#2563eb)] px-5 text-sm font-semibold text-white transition-[filter] hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-accent,#2563eb)]"
        >
          {submitLabel}
        </button>
        {showReset && hasFilters ? (
          <Link
            href={resetCatalogHref()}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-800 hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            Resetează
          </Link>
        ) : null}
      </div>
    </form>
  );
}
