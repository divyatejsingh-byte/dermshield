/** Placeholder while saved data is read after mount, so pages never flash an empty "not scanned" state. */
export default function PageSkeleton() {
  return (
    <main className="mx-auto max-w-7xl px-4 pb-12 pt-28 sm:px-6" aria-busy="true" aria-label="Loading your data">
      <div className="h-4 w-32 animate-pulse rounded bg-slate-800/70" />
      <div className="mt-4 h-10 w-2/3 max-w-xl animate-pulse rounded bg-slate-800/70" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="h-40 animate-pulse rounded-2xl bg-slate-800/50" />
        <div className="h-40 animate-pulse rounded-2xl bg-slate-800/50" />
      </div>
    </main>
  );
}
