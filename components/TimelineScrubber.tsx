"use client";

import { CalendarClock, Lock } from "lucide-react";
import { TIMELINE_DAYS, dayLabel } from "@/lib/shieldEngine";
import { cn } from "@/lib/utils";

interface Props {
  day: number;
  onDay: (day: number) => void;
  /** Days after this are locked (demo profile unlocks one step at a time). Default: all unlocked. */
  unlockedDay?: number;
  /** Shown while some days are still locked: reveal the next day. */
  onAdvance?: () => void;
}

export default function TimelineScrubber({ day, onDay, unlockedDay = 7, onAdvance }: Props) {
  const idx = TIMELINE_DAYS.findIndex((d) => d === day);
  const pct = idx < 0 ? 0 : (idx / (TIMELINE_DAYS.length - 1)) * 100;

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5" aria-labelledby="time-title">
      <div className="mb-5 flex items-center justify-between">
        <h2 id="time-title" className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
          <CalendarClock className="h-4 w-4 text-emerald-400" /> Healing Simulator
        </h2>
        <span className="text-xs text-slate-500">Tap a day to see how your skin heals</span>
      </div>

      <div className="relative mx-4 sm:mx-10">
        <div className="absolute left-0 right-0 top-[15px] h-1.5 rounded-full bg-slate-800" />
        <div
          className="absolute left-0 top-[15px] h-1.5 rounded-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-500 transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
        <ol className="relative flex justify-between">
          {TIMELINE_DAYS.map((d) => {
            const reached = d <= day;
            const current = d === day;
            const locked = d > unlockedDay;
            return (
              <li key={d} className="flex w-0 flex-col items-center">
                <button
                  onClick={() => !locked && onDay(d)}
                  disabled={locked}
                  aria-label={`Day ${d}: ${dayLabel(d)}${locked ? " (locked)" : ""}`}
                  aria-current={current ? "step" : undefined}
                  className={cn(
                    "z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition",
                    current
                      ? "scale-110 border-emerald-400 bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30"
                      : reached
                        ? "border-emerald-500/60 bg-slate-900 text-emerald-300"
                        : "border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-500",
                    locked && "cursor-not-allowed opacity-50 hover:border-slate-700",
                  )}
                >
                  {locked ? <Lock className="h-3.5 w-3.5" /> : d}
                </button>
                <span
                  className={cn(
                    "mt-2 whitespace-nowrap text-xs font-medium",
                    current ? "text-slate-100" : "text-slate-500",
                  )}
                >
                  Day {d}
                </span>
                <span className="whitespace-nowrap text-[10px] text-slate-500">{dayLabel(d)}</span>
              </li>
            );
          })}
        </ol>
      </div>

      {onAdvance && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
          <p className="text-xs text-slate-400">
            Starts at Day {unlockedDay}. Unlock the next step to watch your skin heal.
          </p>
          <button
            onClick={onAdvance}
            className="rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-emerald-400"
          >
            Unlock next day
          </button>
        </div>
      )}
    </section>
  );
}
