export default function DashboardLeadsLoading() {
  return (
    <div className="flex min-w-0 flex-col gap-5" aria-busy="true" aria-label="Se încarcă lead-urile">
      <div className="h-8 w-48 animate-pulse rounded bg-zinc-200" />
      <div className="h-4 w-full max-w-md animate-pulse rounded bg-zinc-100" />
      <div className="h-40 animate-pulse rounded-lg bg-zinc-100" />
    </div>
  );
}
