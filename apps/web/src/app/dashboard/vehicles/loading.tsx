export default function DashboardVehiclesLoading() {
  return (
    <div className="flex min-w-0 flex-col gap-4" aria-busy="true" aria-live="polite">
      <div className="flex flex-col gap-2">
        <div className="h-3 w-20 animate-pulse rounded bg-zinc-200" />
        <div className="h-7 w-40 max-w-full animate-pulse rounded bg-zinc-200" />
        <div className="h-4 w-full max-w-md animate-pulse rounded bg-zinc-200" />
      </div>
      <div className="flex gap-2">
        <div className="h-11 w-20 animate-pulse rounded-md bg-zinc-200" />
        <div className="h-11 w-24 animate-pulse rounded-md bg-zinc-200" />
      </div>
      <div className="flex flex-col gap-3">
        <div className="h-28 animate-pulse rounded-lg border border-zinc-200 bg-white" />
        <div className="h-28 animate-pulse rounded-lg border border-zinc-200 bg-white" />
      </div>
      <p className="text-sm text-zinc-600">Se încarcă vehiculele…</p>
    </div>
  );
}
