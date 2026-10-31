/** Common frame for the tool pages: clears the fixed top bar and gives each page a title. */
export default function PageShell({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto max-w-7xl px-4 pb-12 pt-24 sm:px-6 md:pb-20 md:pt-28">
      <header className="mb-8 md:mb-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-400">{eyebrow}</p>
        <h1 className="mt-3 max-w-3xl font-display text-[clamp(28px,4.4vw,56px)] font-bold leading-[1.05] tracking-tight">
          {title}
        </h1>
        {intro && <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-400">{intro}</p>}
      </header>
      {children}
    </main>
  );
}
