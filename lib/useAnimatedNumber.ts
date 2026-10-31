"use client";

import { useEffect, useRef, useState } from "react";

/** Smoothly tweens toward `target` (ease-out cubic). */
export function useAnimatedNumber(target: number, duration = 700): number {
  const [value, setValue] = useState(target);
  const current = useRef(target);

  useEffect(() => {
    const from = current.current;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      current.current = from + (target - from) * eased;
      setValue(current.current);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}
