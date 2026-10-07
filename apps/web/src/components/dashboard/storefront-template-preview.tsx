import type { CSSProperties } from "react";
import type { PublicVehicleDto } from "@/lib/storefront/public-dto";
import {
  formatPublicVehicleMileage,
  formatPublicVehiclePrice,
} from "@/lib/storefront/public-vehicle-display";
import { resolveStorefrontShellClass } from "@/lib/storefront/storefront-shell-helpers";
import { getStorefrontTemplate } from "@/lib/storefront/templates/registry";
import {
  IconBody,
  IconFuel,
  IconSearch,
  IconTag,
} from "@/components/storefront/icons";

export type TemplatePreviewVehicle = Pick<
  PublicVehicleDto,
  "make" | "model" | "year" | "price" | "mileage" | "fuel" | "locationCity"
> & {
  coverUrl?: string | null;
};

type StorefrontTemplatePreviewProps = {
  templateId: string;
  tenantName: string;
  primaryColor: string;
  vehicles: TemplatePreviewVehicle[];
  comingSoon?: boolean;
};

/**
 * Staff-only storefront preview chrome for template settings (iframe target).
 * Does not mutate branding or write to DB.
 */
export function StorefrontTemplatePreview({
  templateId,
  tenantName,
  primaryColor,
  vehicles,
  comingSoon = false,
}: StorefrontTemplatePreviewProps) {
  const template = getStorefrontTemplate(templateId);
  const shellClass = resolveStorefrontShellClass(template.id);
  const tokenStyle = {
    ["--sf-accent" as string]: primaryColor,
  } as CSSProperties;

  const cards =
    vehicles.length > 0
      ? vehicles
      : [
          {
            make: "Demo",
            model: "Model",
            year: new Date().getFullYear(),
            price: "19990",
            mileage: 25000,
            fuel: null,
            locationCity: "București",
            coverUrl: null,
          } satisfies TemplatePreviewVehicle,
        ];

  return (
    <div
      className={`${shellClass} flex min-h-full min-w-0 flex-col text-[var(--sf-text)]`}
      data-storefront-template={template.id}
      data-template-preview="true"
      style={tokenStyle}
    >
      {comingSoon ? (
        <div className="border-b border-[var(--sf-border)] bg-[var(--sf-surface-muted)] px-4 py-2 text-center text-xs font-medium text-[var(--sf-text-muted)]">
          Previzualizare — {template.labelRo} (în pregătire, nu poate fi activat încă)
        </div>
      ) : (
        <div className="border-b border-[var(--sf-border)] bg-[var(--sf-surface-muted)] px-4 py-2 text-center text-xs font-medium text-[var(--sf-text-muted)]">
          Previzualizare — {template.labelRo} (nesalvat)
        </div>
      )}

      <div className="sf-canvas mx-auto flex w-full max-w-[1200px] flex-1 flex-col shadow-[0_0_0_1px_rgba(24,24,27,0.06)]">
        <header className="sticky top-0 z-10 border-b border-[var(--sf-border)] bg-[var(--sf-surface)]/95 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-2 px-3 py-2.5 md:px-8">
            <p className="truncate text-base font-semibold tracking-tight md:text-lg">
              {tenantName}
            </p>
            <span
              className="inline-flex min-h-9 items-center rounded-full px-3.5 text-sm font-bold text-white"
              style={{ backgroundColor: "var(--sf-accent)" }}
            >
              Sună
            </span>
          </div>
        </header>

        <main className="flex w-full flex-col gap-4 px-3 py-3 md:px-8 md:py-6">
          <div className="sf-solid-card flex flex-col gap-3 rounded-2xl border border-[var(--sf-border)] p-3 md:gap-4 md:p-5">
            <div className="flex rounded-full bg-[var(--sf-surface-muted)] p-1 md:max-w-md">
              <span className="inline-flex min-h-10 flex-1 items-center justify-center rounded-full bg-[var(--sf-surface)] px-3 text-sm font-semibold shadow-sm">
                În stoc
              </span>
              <span className="inline-flex min-h-10 flex-1 items-center justify-center rounded-full px-3 text-sm font-medium text-[var(--sf-text-muted)]">
                Urmează în stoc
              </span>
            </div>
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[var(--sf-text-muted)]">
                <IconSearch size={18} />
              </span>
              <div className="flex min-h-12 items-center rounded-2xl border border-[var(--sf-border)] bg-[var(--sf-surface-muted)] py-2.5 pr-3 pl-11 text-sm text-[var(--sf-text-muted)]">
                Caută marca sau modelul...
              </div>
            </div>
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

          <p className="text-sm text-[var(--sf-text-muted)]">
            <span className="font-semibold text-[var(--sf-text)]">{cards.length}</span>{" "}
            {cards.length === 1 ? "mașină" : "mașini"} în previzualizare
          </p>

          <ul className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-6">
            {cards.map((vehicle, index) => (
              <li
                key={`${vehicle.make}-${vehicle.model}-${index}`}
                className="sf-solid-card overflow-hidden rounded-[var(--sf-radius-lg)] border border-[var(--sf-border)]"
              >
                <div className="flex aspect-[16/10] items-center justify-center bg-[var(--sf-surface-muted)] text-sm text-[var(--sf-text-muted)]">
                  {vehicle.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- preview-only external/demo URLs
                    <img
                      src={vehicle.coverUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    "Imagine indisponibilă"
                  )}
                </div>
                <div className="flex flex-col gap-1 p-3">
                  <p className="text-lg font-bold tracking-tight">
                    {formatPublicVehiclePrice({ price: vehicle.price })}
                  </p>
                  <h2 className="text-base font-semibold">
                    {vehicle.make} {vehicle.model}
                  </h2>
                  <p className="text-sm text-[var(--sf-text-muted)]">
                    {vehicle.year} ·{" "}
                    {formatPublicVehicleMileage({ mileage: vehicle.mileage })}
                    {vehicle.locationCity ? ` · ${vehicle.locationCity}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </main>
      </div>
    </div>
  );
}
