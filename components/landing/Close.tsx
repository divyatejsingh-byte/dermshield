export default function Close() {
  return (
    <section className="relative flex min-h-screen flex-col overflow-hidden px-6 pt-28 md:px-16">
      <div className="grid flex-1 content-start gap-12 md:grid-cols-[1.4fr_1fr]">
        <div>
          <h2 className="max-w-[16ch] font-display text-[clamp(36px,6.4vw,96px)] font-bold leading-[0.97] tracking-tight">
            Skincare that protects your face—and your wallet.
          </h2>
          <p className="mt-8 max-w-lg text-sm leading-relaxed text-slate-400">
            Real-time pricing matched across Amazon.in, Flipkart, and Nykaa. Powered by YouCam Skin AI.
          </p>
        </div>
        <div className="flex flex-col gap-3 md:items-end md:justify-start md:pt-14">
          <a
            href="#console"
            className="w-full rounded-full bg-emerald-500 px-6 py-3 text-center text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 md:w-auto"
          >
            Scan Your Skin Now — It&apos;s Free
          </a>
        </div>
      </div>

      <div className="mt-16 flex flex-wrap items-center justify-between gap-x-8 gap-y-2 border-t border-slate-800 py-4 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> All systems running
        </span>
        <span>Powered by YouCam Skin AI</span>
        <span>© {new Date().getFullYear()} DermShield · Not medical advice</span>
      </div>

      {/* Base wordmark: bottom page edge crops it */}
      <div
        className="pointer-events-none -mx-6 select-none whitespace-nowrap text-center font-display font-bold leading-[0.8] tracking-[-0.05em] text-slate-100/90 md:-mx-16"
        style={{ fontSize: "17.5vw", transform: "translateY(18%)" }}
        aria-hidden
      >
        DERMSHIELD
      </div>
    </section>
  );
}
