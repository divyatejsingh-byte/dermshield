"use client";

import { CalendarClock } from "lucide-react";
import { TIMELINE_DAYS, dayLabel } from "@/lib/shieldEngine";
import { cn } from "@/lib/utils";

interface Props {
  day: number;
  onDay: (day: number) => void;
}

export default function TimelineScrubber({ day, onDay }: Props) {
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
            return (
              <li key={d} className="flex w-0 flex-col items-center">
                <button
                  onClick={() => onDay(d)}
                  aria-label={`Day ${d}: ${dayLabel(d)}`}
                  aria-current={current ? "step" : undefined}
                  className={cn(
                    "z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition",
                    current
                      ? "scale-110 border-emerald-400 bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30"
                      : reached
                        ? "border-emerald-500/60 bg-slate-900 text-emerald-300"
                        : "border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-500",
                  )}
                >
                  {d}
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
    </section>
  );
}
