"use client";

import { ArrowDownRight, ArrowUpRight, Minus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StoredScan } from "@/types/dermshield";

const STAGE_LABEL: Record<StoredScan["stage"], { label: string; cls: string }> = {
  compromised: { label: "Compromised / Raw", cls: "text-rose-300" },
  healing: { label: "Healing Phase", cls: "text-amber-300" },
  restored: { label: "Fully Restored", cls: "text-emerald-300" },
};

function Delta({
  label,
  from,
  to,
  higherIsBetter,
  unit = "",
}: {
  label: string;
  from: number;
  to: number;
  higherIsBetter: boolean;
  unit?: string;
}) {
  const diff = Math.round(to) - Math.round(from);
  const good = diff === 0 ? null : higherIsBetter ? diff > 0 : diff < 0;
  const Icon = diff === 0 ? Minus : diff > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="font-mono text-2xl font-semibold tabular-nums">
          {Math.round(to)}
          {unit}
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-0.5 font-mono text-sm",
            good === null ? "text-slate-500" : good ? "text-emerald-400" : "text-rose-400",
          )}
        >
          <Icon className="h-4 w-4" />
          {diff > 0 ? "+" : ""}
          {diff}
          {unit}
        </span>
      </div>
      <div className="mt-0.5 font-mono text-[11px] text-slate-500">
        was {Math.round(from)}
        {unit}
      </div>
    </div>
  );
}

export default function ProgressHistory({
  scans,
  onClear,
  signedIn,
}: {
  scans: StoredScan[];
  onClear: () => void;
  signedIn: boolean;
}) {
  const first = scans[0];
  const latest = scans[scans.length - 1];
  const recent = [...scans].reverse().slice(0, 6);

  return (
    <section id="progress" className="scroll-mt-20 px-5 pb-12 md:px-16 md:pb-24">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-emerald-400">
            YOUR PROGRESS
          </p>
          <h2 className="mt-3 font-display text-[clamp(24px,3.4vw,44px)] font-bold leading-tight tracking-tight">
            See how far your skin has come.
          </h2>
        </div>
        {scans.length > 0 && (
          <button
            onClick={onClear}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 px-3 py-1.5 text-xs text-slate-400 transition hover:border-rose-500/50 hover:text-rose-300"
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear history
          </button>
        )}
      </div>

      {scans.length === 0 ? (
        <p className="mt-6 max-w-xl text-sm text-slate-400">
          No scans yet. {signedIn ? "Your results are saved to your account." : "Sign in with Google to save your progress across devices. Until then, results stay on this device."}
        </p>
      ) : scans.length === 1 ? (
        <p className="mt-6 max-w-xl text-sm text-slate-400">
          First scan saved (Day {first.dayNumber}, Shield Score {Math.round(first.metrics.shieldScore)}).
          Scan again later to see your change.
        </p>
      ) : (
        <>
          <p className="mt-4 text-sm text-slate-400">
            Change since your first scan (Day {first.dayNumber}) to your latest (Day {latest.dayNumber}).
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Delta label="Skin Shield Score" from={first.metrics.shieldScore} to={latest.metrics.shieldScore} higherIsBetter />
            <Delta label="Redness & Irritation" from={first.metrics.redness} to={latest.metrics.redness} higherIsBetter={false} unit="%" />
            <Delta label="Skin Texture & Flaking" from={first.metrics.roughness} to={latest.metrics.roughness} higherIsBetter={false} unit="%" />
            <Delta label="Moisture Level" from={first.metrics.hydration} to={latest.metrics.hydration} higherIsBetter unit="%" />
          </div>
        </>
      )}

      {recent.length > 0 && (
        <ul className="mt-8 divide-y divide-slate-800 border-y border-slate-800">
          {recent.map((s) => (
            <li
              key={s.id}
              className="grid grid-cols-[auto_1fr_auto] items-center gap-x-4 py-3 font-mono text-xs sm:grid-cols-[70px_1fr_auto_auto]"
            >
              <span className="text-slate-300">Day {s.dayNumber}</span>
              <span className="hidden text-slate-500 sm:block">
                {new Date(s.timestamp).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <span className={STAGE_LABEL[s.stage].cls}>{STAGE_LABEL[s.stage].label}</span>
              <span className="text-right text-slate-200">Score {Math.round(s.metrics.shieldScore)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
