"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { baseScore, projectMetrics } from "@/lib/shieldEngine";
import { cn } from "@/lib/utils";
import type { SkinMetrics } from "@/types/dermshield";
import { TONE, type Tone } from "../tone";

interface Props {
  baseline: SkinMetrics | null;
  day: number;
  onDay: (day: number) => void;
}

const PHASES: Array<{ day: number; title: string; sub: string; tone: Tone }> = [
  { day: 1, title: "Raw & Irritated", sub: "Harsh products paused. Skin rests.", tone: "rose" },
  { day: 4, title: "Healing Phase", sub: "Calming creams help skin recover.", tone: "amber" },
  { day: 7, title: "Fully Restored", sub: "Skin has healed. Safe Store open.", tone: "emerald" },
];

export default function RecoveryEngine({ baseline, day, onDay }: Props) {
  const active = PHASES.reduce(
    (best, p, i) => (Math.abs(p.day - day) < Math.abs(PHASES[best].day - day) ? i : best),
    0,
  );
  const [dx, setDx] = useState(0);
  const drag = useRef<{ x: number; id: number } | null>(null);

  const go = (i: number) => onDay(PHASES[(i + PHASES.length) % PHASES.length].day);

  return (
    <section id="engine" className="grid scroll-mt-20 items-center gap-10 px-5 py-12 md:min-h-screen md:grid-cols-2 md:gap-14 md:px-16 md:py-24">
      <div>
        <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.22em] text-emerald-400">
          TRACK HEALING
        </p>
        <h2 className="font-display text-[clamp(32px,5vw,72px)] font-bold leading-[0.95] tracking-tight">
          Watch your skin&apos;s natural shield heal.
        </h2>
        <p className="mt-6 max-w-md text-base leading-relaxed text-slate-400">
          Skin heals day by day, not all at once. YouCam Skin AI tracks your redness, texture and
          moisture over several days, and brings products back one at a time as each reading
          returns to a healthy range.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/audit"
            className="rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
          >
            Audit My Products
          </Link>
          <Link
            href="#simulator"
            className="rounded-full border border-slate-600 px-5 py-2.5 text-sm font-semibold transition hover:border-emerald-500 hover:text-emerald-300"
          >
            Open the Healing Simulator
          </Link>
        </div>
      </div>

      {!baseline ? (
        <div className="mx-auto flex aspect-square w-full max-w-[440px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-700 p-8 text-center">
          <p className="font-display text-2xl font-bold">Your healing timeline</p>
          <p className="mt-3 max-w-xs text-sm text-slate-400">
            Scan your skin and we&apos;ll show how it can recover over the next 7 days.
          </p>
          <Link
            href="/scan"
            className="mt-6 rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
          >
            Check My Skin
          </Link>
        </div>
      ) : (
      <div className="mx-auto w-full max-w-[440px]">
        <div className="relative aspect-square w-full touch-pan-y select-none">
          {PHASES.map((p, i) => {
            const pos = (i - active + PHASES.length) % PHASES.length;
            const top = pos === 0;
            const m = projectMetrics(baseline!, p.day);
            const tone = TONE[p.tone];
            return (
              <article
                key={p.day}
                onPointerDown={(e) => {
                  if (!top) return;
                  drag.current = { x: e.clientX, id: e.pointerId };
                  e.currentTarget.setPointerCapture(e.pointerId);
                }}
                onPointerMove={(e) => {
                  if (top && drag.current) setDx(e.clientX - drag.current.x);
                }}
                onPointerUp={() => {
                  if (!top || !drag.current) return;
                  const moved = dx;
                  drag.current = null;
                  setDx(0);
                  if (Math.abs(moved) < 6) go(active + 1);
                  else go(active + (moved < 0 ? 1 : -1));
                }}
                onPointerCancel={() => {
                  drag.current = null;
                  setDx(0);
                }}
                className={cn(
                  "absolute inset-0 flex flex-col justify-between rounded-3xl border bg-slate-900 p-7 shadow-2xl",
                  tone.border,
                  top ? "cursor-grab active:cursor-grabbing" : "pointer-events-none",
                  !drag.current && "transition-all duration-500 ease-out",
                )}
                style={{
                  zIndex: PHASES.length - pos,
                  transform: top
                    ? `translateX(${dx}px) rotate(${dx / 18}deg)`
                    : `translateY(${pos * 16}px) scale(${1 - pos * 0.06})`,
                  opacity: top ? 1 : 1 - pos * 0.3,
                }}
              >
                <div>
                  <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    <span>Day {String(p.day).padStart(2, "0")}</span>
                    <span className={tone.text}>{Math.round(baseScore(m))} / 100</span>
                  </div>
                  <h3 className={cn("mt-4 font-display text-3xl font-bold leading-tight", tone.text)}>
                    {p.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-400">{p.sub}</p>
                </div>
                <dl className="space-y-2.5 font-mono text-xs">
                  {(
                    [
                      ["Redness & Irritation", m.redness, true],
                      ["Skin Texture & Flaking", m.roughness, true],
                      ["Moisture Level", m.hydration, false],
                    ] as const
                  ).map(([label, v, worse]) => (
                    <div key={label}>
                      <div className="flex justify-between text-slate-400">
                        <dt>{label}</dt>
                        <dd>{Math.round(v)}</dd>
                      </div>
                      <div className="mt-1 h-1 rounded-full bg-slate-800">
                        <div
                          className={cn("h-full rounded-full", worse ? "bg-rose-400/80" : "bg-emerald-400/80")}
                          style={{ width: `${v}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </dl>
              </article>
            );
          })}
        </div>

        <div className="mt-10 flex items-center justify-center gap-2.5">
          {PHASES.map((p, i) => (
            <button
              key={p.day}
              onClick={() => go(i)}
              aria-label={`Show Day ${p.day}`}
              className={cn(
                "h-2 rounded-full transition-all",
                i === active ? "w-7 bg-emerald-400" : "w-2 bg-slate-700 hover:bg-slate-500",
              )}
            />
          ))}
        </div>
        <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
          Drag or tap the card to see each stage
        </p>
      </div>
      )}
    </section>
  );
}
