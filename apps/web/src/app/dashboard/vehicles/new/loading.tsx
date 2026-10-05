export default function DashboardVehicleCreateLoading() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4" aria-busy="true">
      <div className="h-7 w-48 animate-pulse rounded bg-zinc-200" />
      <div className="h-64 animate-pulse rounded-lg border border-zinc-200 bg-white" />
      <p className="text-sm text-zinc-500">Se încarcă formularul…</p>
    </div>
  );
}