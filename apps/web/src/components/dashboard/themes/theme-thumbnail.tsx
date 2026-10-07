import type { StorefrontTemplateDefinition } from "@/lib/storefront/templates/registry";
import { Theme1Thumbnail } from "@/components/dashboard/themes/theme-1-thumbnail";

type ThemeThumbnailProps = {
  template: StorefrontTemplateDefinition;
  className?: string;
};

/**
 * Gallery card preview:
 * - Template 1 → mini-screenshot of Template 1 + demo vehicles
 * - Template 2 / others → stylized CSS mock (coming soon)
 */
export function ThemeThumbnail({ template, className = "" }: ThemeThumbnailProps) {
  if (template.layoutId === "template-1" || template.id === "template-1") {
    return <Theme1Thumbnail className={className} />;
  }

  return (
    <div
      className={`relative overflow-hidden bg-zinc-100 ${className}`}
      data-theme-thumbnail={template.id}
      aria-hidden
    >
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-200 via-white to-teal-50" />
      <div className="relative flex h-full flex-col p-3 sm:p-4">
        <div className="flex items-center justify-between rounded-md bg-white/90 px-2.5 py-2 shadow-sm ring-1 ring-zinc-200/80">
          <div className="h-2 w-16 rounded bg-zinc-800/80" />
          <div className="h-6 w-14 rounded-full bg-teal-800/90" />
        </div>
        <div className="mt-3 flex flex-1 flex-col gap-2">
          <div className="h-8 rounded-lg bg-white/80 ring-1 ring-zinc-200/70" />
          <div className="grid flex-1 grid-cols-3 gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex min-h-0 flex-col overflow-hidden rounded-md bg-white/90 ring-1 ring-zinc-200/70"
              >
                <div
                  className="aspect-[16/10] w-full"
                  style={{
                    background: `linear-gradient(135deg, #0f766e ${20 + i * 10}%, #99f6e4)`,
                  }}
                />
                <div className="space-y-1.5 p-1.5">
                  <div className="h-1.5 w-3/4 rounded bg-zinc-300" />
                  <div className="h-1.5 w-1/2 rounded bg-zinc-200" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <span className="absolute right-3 bottom-3 rounded-full bg-zinc-900/80 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-white uppercase">
          În pregătire
        </span>
      </div>
    </div>
  );
}
