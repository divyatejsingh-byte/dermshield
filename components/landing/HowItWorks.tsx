const STEPS = [
  {
    n: "01",
    title: "Scan Your Face",
    body: "Our AI detects redness, raw patches, and dry spots in seconds.",
  },
  {
    n: "02",
    title: "Pause the Culprits",
    body: "Add the bottles you currently use. We pinpoint the harsh acids or retinols that are irritating your face and freeze them for 5 days.",
  },
  {
    n: "03",
    title: "Rebuild Your Natural Shield",
    body: "Watch your face calm down day by day. We only suggest gentle, safe creams once your outer skin layer has completely recovered.",
  },
];

/** `bare` returns just the three steps, for pages that supply their own heading and spacing. */
export default function HowItWorks({ bare = false }: { bare?: boolean }) {
  const steps = (
    <ol className="grid gap-5 md:grid-cols-3">
        {STEPS.map((s) => (
          <li key={s.n} className="rounded-2xl border border-slate-800 bg-slate-900/50 p-7">
            <span className="font-mono text-xs text-emerald-400">STEP {s.n}</span>
            <h3 className="mt-4 font-display text-2xl font-bold leading-tight tracking-tight">{s.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">{s.body}</p>
          </li>
        ))}
    </ol>
  );
  if (bare) return steps;
  return (
    <section id="how" className="scroll-mt-20 px-5 py-12 md:px-16 md:py-24">
      <p className="mb-10 font-mono text-[11px] uppercase tracking-[0.22em] text-emerald-400">
        HOW IT WORKS
      </p>
      {steps}
    </section>
  );
}
