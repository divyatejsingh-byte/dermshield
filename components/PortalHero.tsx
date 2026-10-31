"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

/**
 * Scroll-driven portal. A rAF-throttled listener writes progress (0..1) to the
 * `--hp` CSS variable; every layer derives its transform/opacity from it in CSS,
 * so scrolling never triggers a React re-render.
 */
export default function PortalHero() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Always open on the closed shutter: don't let the browser restore a mid-page scroll position.
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    const toTop = () => {
      if (!window.location.hash || window.location.hash === "#top") {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
      }
    };
    toTop();
    // Browsers may restore the old position after hydration/load; reset again.
    const t = window.setTimeout(toTop, 120);
    window.addEventListener("load", toTop, { once: true });

    let raf = 0;
    const update = () => {
      raf = 0;
      const range = el.offsetHeight - window.innerHeight;
      const p = range > 0 ? -el.getBoundingClientRect().top / range : 0;
      el.style.setProperty("--hp", Math.min(1, Math.max(0, p)).toFixed(4));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("load", toTop);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Panels finish opening at 80% of the runway so the face is fully clear before the section ends.
  const open = "clamp(0, calc(var(--hp) / 0.8), 1)";
  const wordmark =
    "font-display font-bold leading-none tracking-[-0.03em] text-[clamp(44px,11.5vw,190px)] pr-[0.05em] will-change-transform";

  return (
    <section
      id="top"
      ref={ref}
      className="relative h-[250vh] w-full"
      style={{ ["--hp" as string]: 0 }}
    >
      <div className="sticky top-0 isolate h-screen w-full overflow-hidden bg-slate-950">
        {/* 1. Backdrop */}
        <div
          className="absolute inset-0 will-change-transform"
          style={{ transform: "scale(calc(1.1 - 0.1 * var(--hp)))" }}
        >
          <Image
            src="/images/hero-portrait.jpg"
            alt="Two friends smiling while wearing face masks"
            fill
            priority
            sizes="100vw"
            quality={90}
            className="object-cover object-[50%_35%]"
          />
        </div>

        {/* 2. Diagnostic wash + vignette */}
        <div
          className="absolute inset-0 mix-blend-overlay"
          style={{
            background: "linear-gradient(115deg, #10b981 0%, #f59e0b 55%, #10b981 100%)",
            opacity: "calc(var(--hp) * 0.25)",
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,#020617_100%)]" />

        {/* 3. Split shield panels carrying the wordmark */}
        <div
          className="absolute inset-y-0 left-0 z-10 flex w-[51vw] items-center justify-end border-r border-emerald-500/20 bg-slate-950 pr-[3.2vw] shadow-[inset_-1px_0_0_rgba(16,185,129,0.15)] will-change-transform"
          style={{ transform: `translate3d(calc(-100% * ${open}), 0, 0)` }}
        >
          <span className={wordmark}>DERM</span>
          {/* Sensor dot: single pulsing indicator after the M */}
          <span className="relative ml-[0.9vw] mt-[5vw] flex h-2.5 w-2.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
            <span className="relative h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_#10b981]" />
          </span>
        </div>
        <div
          className="absolute inset-y-0 right-0 flex w-[51vw] items-center justify-start border-l border-emerald-500/20 bg-slate-950 pl-[5vw] shadow-[inset_1px_0_0_rgba(16,185,129,0.15)] will-change-transform"
          style={{ transform: `translate3d(calc(100% * ${open}), 0, 0)` }}
        >
          <span className={`${wordmark} text-emerald-400`}>SHIELD</span>
        </div>

        {/* 5. Status pill (always visible) */}
        <div
          className="pointer-events-none absolute inset-x-0 top-[112px] z-20 flex justify-center"
          style={{ opacity: "clamp(0, calc(1 - (var(--hp) - 0.2) * 5), 1)" }}
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-slate-950/70 px-3.5 py-1.5 text-[11px] font-medium tracking-wide text-emerald-300 backdrop-blur">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            Powered by YouCam Skin AI
          </span>
        </div>

        {/* 6. Headline block, revealed as the panels open */}
        <div
          className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent px-5 pb-20 pt-40 md:px-10 md:pb-24"
          style={{
            opacity: "clamp(0, calc((var(--hp) - 0.35) * 4), 1)",
            transform: "translateY(calc((1 - clamp(0, calc((var(--hp) - 0.35) * 4), 1)) * 24px))",
            pointerEvents: "none",
          }}
        >
          <div className="mx-auto max-w-3xl text-center md:mx-0 md:text-left">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-slate-950/70 px-3.5 py-1.5 text-[11px] font-medium tracking-wide text-emerald-300 backdrop-blur">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              Powered by YouCam Skin AI
            </span>
            <h1 className="font-display text-[clamp(30px,5.2vw,72px)] font-bold leading-[1.02] tracking-tight">
              Stop the burn. Fix damaged skin.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-200 md:text-base">
              When your face is red, peeling, or stinging from using too many harsh products, buying
              another cream only makes it worse. DermShield checks your skin, tells you which bottles to
              pause, and helps your skin heal its natural shield.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3 md:justify-start">
              <a
                href="#console"
                className="pointer-events-auto rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
              >
                Check My Skin
              </a>
              <a
                href="#roster"
                className="pointer-events-auto rounded-full border border-slate-300/50 bg-slate-950/40 px-6 py-3 text-sm font-semibold backdrop-blur transition hover:border-emerald-400 hover:text-emerald-300"
              >
                Audit My Products
              </a>
            </div>
          </div>
        </div>

        {/* 7. Corner metadata */}
        <div className="pointer-events-none absolute inset-0 z-20 font-mono text-[10.5px] uppercase tracking-[0.18em] text-slate-200 [text-shadow:0_1px_10px_rgba(2,6,23,0.95)]">
          <span className="absolute left-5 top-[78px] md:left-10">Instant AI Scan</span>
          <span className="absolute right-5 top-[78px] text-right md:right-10">Zero Product Overload</span>
          <span className="absolute bottom-6 left-5 max-w-[44vw] md:bottom-10 md:left-10">
            Redness &amp; Irritation Check
          </span>
          <span className="absolute bottom-6 right-5 max-w-[44vw] text-right md:bottom-10 md:right-10">
            Doctor-Approved Reset
          </span>
        </div>
      </div>
    </section>
  );
}
