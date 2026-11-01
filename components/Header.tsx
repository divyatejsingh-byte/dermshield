"use client";

import { ShieldCheck } from "lucide-react";
import { STAGE_META } from "@/lib/shieldEngine";
import { cn } from "@/lib/utils";
import type { Stage } from "@/types/dermshield";
import ScoreDial from "./ScoreDial";
import { TONE } from "./tone";

/** `null` renders the same card in a muted "not scanned yet" state, so the page doesn't jump when a scan lands. */
export default function Header({ score, stage }: { score: number | null; stage: Stage | null }) {
  const empty = score === null || stage === null;
  const meta = STAGE_META[stage ?? "acute"];
  const tone = empty ? TONE.amber : TONE[meta.tone];

  return (
    <header className="border-b border-slate-800/80 bg-slate-950/80 rounded-2xl border">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-xl ring-1 transition-colors",
              tone.badge,
            )}
          >
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-tight tracking-tight">DermShield</h1>
            <p className="text-xs text-slate-400 sm:text-sm">
              Smart skin protection powered by YouCam Skin AI.
            </p>
          </div>
        </div>

        <div
          className={cn(
            "flex items-center gap-3 rounded-full border bg-slate-900/70 py-1.5 pl-1.5 pr-4 transition-colors",
            tone.border,
          )}
        >
          <ScoreDial score={score ?? 0} stage={stage ?? "acute"} size={52} className={empty ? "opacity-30 grayscale" : undefined} />
          <div className="leading-tight">
            <div className="text-[10px] uppercase tracking-wider text-slate-500">
              Skin Shield Score
            </div>
            <span
              className={cn(
                "mt-0.5 inline-block rounded-full px-2 py-0.5 text-xs font-medium ring-1",
                tone.badge,
              )}
            >
              {empty ? "Not scanned yet" : meta.label}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
