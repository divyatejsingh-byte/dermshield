"use client";

import { useEffect, type RefObject } from "react";

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/**
 * Writes scroll state straight to CSS variables (no React re-renders):
 *  - `--sy` on <html>: window.scrollY in px (unitless)
 *  - `--hp` on `heroRef`: 0..1 progress through the hero's sticky range
 */
export function useScrollVars(heroRef: RefObject<HTMLElement>) {
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      document.documentElement.style.setProperty("--sy", String(Math.round(window.scrollY)));
      const hero = heroRef.current;
      if (hero) {
        const range = hero.offsetHeight - window.innerHeight;
        const p = range > 0 ? clamp01(-hero.getBoundingClientRect().top / range) : 0;
        hero.style.setProperty("--hp", p.toFixed(4));
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [heroRef]);
}
