import {
  DEMO_DEALER,
  DEMO_VEHICLES,
  formatDemoPriceEur,
} from "@/lib/storefront/demo/demo-storefront-data";

type Theme1ThumbnailProps = {
  className?: string;
};

/**
 * Static mini-screenshot of Template 1 catalog — local demo data only.
 * Not interactive; not connected to tenant inventory.
 */
export function Theme1Thumbnail({ className = "" }: Theme1ThumbnailProps) {
  const cards = DEMO_VEHICLES.slice(0, 3);

  return (
    <div
      className={`relative overflow-hidden bg-zinc-100 ${className}`}
      data-theme-thumbnail="template-1"
      aria-hidden
    >
      <div
        className="storefront-template-1 pointer-events-none absolute inset-0 origin-top-left scale-[0.42] text-[var(--sf-text)]"
        style={{
          width: "238%",
          height: "238%",
          ["--sf-accent" as string]: DEMO_DEALER.accentColor,
        }}
      >
        <div className="flex h-full flex-col bg-zinc-100">
          <div className="sf-canvas mx-auto flex h-full w-full max-w-[1200px] flex-col shadow-sm">
            <header className="flex items-center justify-between border-b border-[var(--sf-border,#e4e4e7)] bg-white px-6 py-3">
              <span className="text-lg font-semibold tracking-tight">{DEMO_DEALER.name}</span>
              <span
                className="rounded-full px-4 py-1.5 text-sm font-bold text-white"
                style={{ backgroundColor: "var(--sf-accent)" }}
              >
                Sună
              </span>
            </header>
            <div className="flex flex-col gap-4 px-6 py-5">
              <div className="sf-solid-card rounded-2xl border border-[var(--sf-border,#e4e4e7)] p-4">
                <div className="mb-3 flex max-w-sm rounded-full bg-[var(--sf-surface-muted,#f4f4f5)] p-1">
                  <span className="flex-1 rounded-full bg-white py-2 text-center text-sm font-semibold shadow-sm">
                    În stoc
                  </span>
                  <span className="flex-1 py-2 text-center text-sm text-[var(--sf-text-muted,#71717a)]">
                    Urmează în stoc
                  </span>
                </div>
                <div className="mb-3 h-11 rounded-2xl border border-[var(--sf-border,#e4e4e7)] bg-[var(--sf-surface-muted,#f4f4f5)]" />
                <div className="grid grid-cols-3 gap-2">
                  {["Brand", "Caroserie", "Combustibil", "Preț", "An"].map((label) => (
                    <span
                      key={label}
                      className="sf-pill justify-center text-xs font-semibold"
                    >
                      {label}
                    </span>
                  ))}
                  <span
                    className="inline-flex items-center justify-center rounded-2xl text-xs font-bold text-white"
                    style={{ backgroundColor: "var(--sf-accent)" }}
                  >
                    Toate filtrele
                  </span>
                </div>
              </div>
              <p className="text-base font-bold">
                {DEMO_VEHICLES.length} mașini{" "}
                <span className="text-sm font-normal text-[var(--sf-text-muted,#71717a)]">
                  în stoc
                </span>
              </p>
              <ul className="grid grid-cols-3 gap-4">
                {cards.map((vehicle) => (
                  <li
                    key={vehicle.id}
                    className="sf-solid-card overflow-hidden rounded-2xl border border-[var(--sf-border,#e4e4e7)]"
                  >
                    <div className="aspect-[4/3] overflow-hidden bg-[var(--sf-surface-muted,#f4f4f5)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={vehicle.coverSrc}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="space-y-1 p-3">
                      <p className="truncate text-sm font-bold">
                        {vehicle.make} {vehicle.model}
                      </p>
                      <p className="text-base font-bold">
                        {formatDemoPriceEur(vehicle.priceEur)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
