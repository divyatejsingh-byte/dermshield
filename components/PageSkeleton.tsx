/**
 * Placeholder while saved data is read after mount, so pages never flash an empty "not scanned" state.
 * It copies PageShell's spacing and fills the screen, so swapping to the real page causes no jump.
 */
export default function PageSkeleton() {
  return (
    <main
      className="mx-auto min-h-[100dvh] max-w-7xl px-4 pb-12 pt-24 sm:px-6 md:pb-20 md:pt-28"
      aria-busy="true"
      aria-label="Loading your data"
    >
      <div className="h-3 w-28 animate-pulse rounded bg-slate-800/70" />
      <div className="mt-3 h-[58px] w-full max-w-xl animate-pulse rounded bg-slate-800/70 md:h-[62px]" />
      <div className="mt-4 h-11 w-full max-w-2xl animate-pulse rounded bg-slate-800/50" />
      <div className="mt-8 grid gap-4 md:mt-10 sm:grid-cols-2">
        <div className="h-56 animate-pulse rounded-2xl bg-slate-800/50" />
        <div className="h-56 animate-pulse rounded-2xl bg-slate-800/50" />
      </div>
    </main>
  );
}
