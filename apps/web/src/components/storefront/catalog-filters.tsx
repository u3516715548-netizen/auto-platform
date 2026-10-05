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
import {
  IconBody,
  IconFuel,
  IconSearch,
  IconSort,
  IconTag,
} from "@/components/storefront/icons";

type CatalogFiltersProps = {
  query: CatalogQuery;
  /** Prefix for label/input ids so desktop + mobile never collide. */
  idPrefix: string;
  submitLabel: string;
  className?: string;
  /** Show Reset → `/` when filters are active (drawer). */
  showReset?: boolean;
  /** Form id so an external sticky submit can target this form. */
  formId?: string;
  /** Hide bottom actions — used when the drawer owns a sticky „Vezi Rezultatele”. */
  hideActions?: boolean;
};

const fieldShell =
  "flex min-h-12 items-center rounded-lg border border-[var(--sf-border)] bg-white focus-within:border-[var(--sf-accent)] focus-within:ring-2 focus-within:ring-[color-mix(in_srgb,var(--sf-accent)_20%,transparent)]";

const ghostInput =
  "min-h-12 w-full min-w-0 flex-1 border-0 bg-transparent px-3 text-sm text-[var(--sf-text)] outline-none placeholder:text-[var(--sf-text-muted)]";

const unitClass = "shrink-0 pr-3 text-sm font-medium text-[var(--sf-text)]";

const checkboxLabelClass =
  "flex min-h-12 items-center gap-3 border-b border-[var(--sf-border)] py-1 text-sm text-[var(--sf-text)] last:border-b-0";

const checkboxClass =
  "size-5 shrink-0 rounded border-[var(--sf-border)] text-[var(--sf-accent)] focus:ring-[var(--sf-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-accent)]";

function GhostRange({
  id,
  name,
  placeholder,
  unit,
  defaultValue,
  min,
  max,
}: {
  id: string;
  name: string;
  placeholder: string;
  unit?: string;
  defaultValue: string | number;
  min?: number;
  max?: number;
}) {
  return (
    <div className={fieldShell}>
      <label htmlFor={id} className="sr-only">
        {placeholder}
      </label>
      <input
        id={id}
        name={name}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className={ghostInput}
      />
      {unit ? (
        <span className={unitClass} aria-hidden>
          {unit}
        </span>
      ) : null}
    </div>
  );
}

/**
 * Catalog filters — Autovit-like ghost placeholders, no Stare / finanțare.
 * Existing query params only (q, price, year, km, fuel, transmission, bodyType, sort).
 */
export function CatalogFilters({
  query,
  idPrefix,
  submitLabel,
  className,
  showReset = false,
  formId,
  hideActions = false,
}: CatalogFiltersProps) {
  const fuelOptions = enumOptions(VEHICLE_FUEL_LABELS_RO);
  const transmissionOptions = enumOptions(VEHICLE_TRANSMISSION_LABELS_RO);
  const bodyOptions = enumOptions(VEHICLE_BODY_TYPE_LABELS_RO);
  const hasFilters = catalogQueryHasFilterChips(query);
  const id = (name: string) => `${idPrefix}-${name}`;

  return (
    <form
      id={formId}
      method="GET"
      action="/"
      className={className ?? "flex flex-col gap-4"}
    >
      <div className={`${fieldShell} relative`}>
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--sf-text-muted)]">
          <IconSearch size={18} />
        </span>
        <label htmlFor={id("q")} className="sr-only">
          Căutare
        </label>
        <input
          id={id("q")}
          name="q"
          type="search"
          defaultValue={query.q ?? ""}
          maxLength={80}
          placeholder="Căutare"
          className={`${ghostInput} pl-10`}
        />
      </div>
      {query.make.map((m) => (
        <input key={`make-${m}`} type="hidden" name="make" value={m} />
      ))}

      <div className="grid grid-cols-2 gap-2">
        <GhostRange
          id={id("priceMin")}
          name="priceMin"
          placeholder="Preț de la"
          unit="EUR"
          defaultValue={query.priceMin ?? ""}
          min={0}
          max={2_000_000}
        />
        <GhostRange
          id={id("priceMax")}
          name="priceMax"
          placeholder="Preț până la"
          unit="EUR"
          defaultValue={query.priceMax ?? ""}
          min={0}
          max={2_000_000}
        />
        <GhostRange
          id={id("yearMin")}
          name="yearMin"
          placeholder="Anul de la"
          defaultValue={query.yearMin ?? ""}
          min={1950}
          max={2100}
        />
        <GhostRange
          id={id("yearMax")}
          name="yearMax"
          placeholder="Anul până la"
          defaultValue={query.yearMax ?? ""}
          min={1950}
          max={2100}
        />
        <GhostRange
          id={id("kmMin")}
          name="kmMin"
          placeholder="Km de la"
          unit="km"
          defaultValue={query.kmMin ?? ""}
          min={0}
          max={2_000_000}
        />
        <GhostRange
          id={id("kmMax")}
          name="kmMax"
          placeholder="Km până la"
          unit="km"
          defaultValue={query.kmMax ?? ""}
          min={0}
          max={2_000_000}
        />
      </div>

      <div className={fieldShell}>
        <span className="pl-3 text-[var(--sf-text-muted)]" aria-hidden>
          <IconSort size={16} />
        </span>
        <label htmlFor={id("sort")} className="sr-only">
          Sortare
        </label>
        <select
          id={id("sort")}
          name="sort"
          defaultValue={query.sort}
          className={`${ghostInput} appearance-none pr-8`}
        >
          {CATALOG_SORT_VALUES.map((value) => (
            <option key={value} value={value}>
              {CATALOG_SORT_LABELS_RO[value]}
            </option>
          ))}
        </select>
      </div>

      <section className="rounded-xl border border-[var(--sf-border)] bg-white px-3">
        <div className="flex items-center gap-2 border-b border-[var(--sf-border)] py-3">
          <IconFuel size={18} className="text-[var(--sf-accent)]" />
          <div>
            <p className="text-sm font-semibold text-[var(--sf-text)]">Combustibil</p>
            <p className="text-xs text-[var(--sf-text-muted)]">Tip carburant</p>
          </div>
        </div>
        <div className="py-1">
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
      </section>

      <section className="rounded-xl border border-[var(--sf-border)] bg-white px-3">
        <div className="flex items-center gap-2 border-b border-[var(--sf-border)] py-3">
          <IconTag size={18} className="text-[var(--sf-accent)]" />
          <div>
            <p className="text-sm font-semibold text-[var(--sf-text)]">Cutie de viteze</p>
            <p className="text-xs text-[var(--sf-text-muted)]">Transmisie</p>
          </div>
        </div>
        <div className="py-1">
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
      </section>

      <section className="rounded-xl border border-[var(--sf-border)] bg-white px-3">
        <div className="flex items-center gap-2 border-b border-[var(--sf-border)] py-3">
          <IconBody size={18} className="text-[var(--sf-accent)]" />
          <div>
            <p className="text-sm font-semibold text-[var(--sf-text)]">Tip caroserie</p>
            <p className="text-xs text-[var(--sf-text-muted)]">Formă caroserie</p>
          </div>
        </div>
        <div className="py-1">
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
      </section>

      {!hideActions ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="submit"
            className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl bg-[var(--sf-accent,#2563eb)] px-5 text-sm font-bold text-white transition-[filter] hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-accent,#2563eb)]"
          >
            {submitLabel}
          </button>
          {showReset && hasFilters ? (
            <Link
              href={resetCatalogHref()}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--sf-border)] bg-white px-4 text-sm font-medium text-[var(--sf-accent)] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-accent)]"
            >
              Șterge opțiunile
            </Link>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
