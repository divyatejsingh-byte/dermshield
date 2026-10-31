"use client";

import { ArrowDownRight, ArrowUpRight, Camera, CalendarClock, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StoredScan } from "@/types/dermshield";
import { TONE, type Tone } from "./tone";

const STAGE: Record<StoredScan["stage"], { label: string; tone: Tone }> = {
  compromised: { label: "Compromised / Raw", tone: "rose" },
  healing: { label: "Healing Phase", tone: "amber" },
  restored: { label: "Fully Restored", tone: "emerald" },
};

const DAY_MS = 86_400_000;
const startOfDay = (t: number) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

function Stat({ label, value, unit = "" }: { label: string; value: number; unit?: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className="font-mono text-xl font-semibold tabular-nums">
        {Math.round(value)}
        {unit}
      </div>
    </div>
  );
}

function Delta({ diff, higherIsBetter }: { diff: number; higherIsBetter: boolean }) {
  const good = diff === 0 ? null : higherIsBetter ? diff > 0 : diff < 0;
  const Icon = diff === 0 ? Minus : diff > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 font-mono text-xs",
        good === null ? "text-slate-500" : good ? "text-emerald-400" : "text-rose-400",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {diff > 0 ? "+" : ""}
      {diff}
    </span>
  );
}

interface Props {
  name: string;
  guest: boolean;
  scans: StoredScan[];
  loaded: boolean;
}

/** Signed-in home: last session, weekly progress and the next step. */
export default function Dashboard({ name, guest, scans, loaded }: Props) {
  const latest = scans[scans.length - 1];
  const first = scans[0];
  const now = Date.now();

  // Last 7 calendar days, oldest to newest; each shows that day's latest scan.
  const today = startOfDay(now);
  const week = Array.from({ length: 7 }, (_, i) => {
    const dayStart = today - (6 - i) * DAY_MS;
    const dayScans = scans.filter((s) => s.timestamp >= dayStart && s.timestamp < dayStart + DAY_MS);
    return {
      label: new Date(dayStart).toLocaleDateString(undefined, { weekday: "short" }),
      scan: dayScans[dayScans.length - 1] ?? null,
    };
  });
  const weekScans = scans.filter((s) => s.timestamp >= today - 6 * DAY_MS);
  const weekDelta =
    weekScans.length > 1
      ? weekScans[weekScans.length - 1].metrics.shieldScore - weekScans[0].metrics.shieldScore
      : null;

  const daysSince = latest ? Math.floor((today - startOfDay(latest.timestamp)) / DAY_MS) : null;
  const trackingDay = first ? Math.floor((today - startOfDay(first.timestamp)) / DAY_MS) + 1 : 1;
  const stage = latest ? STAGE[latest.stage] : null;

  // A short, caring nudge that changes with how the skin is doing.
  const reminder: { text: string; tone: Tone } = !latest
    ? {
        text: "Your skin isn't a science experiment. Start with one scan, then change one thing at a time.",
        tone: "emerald",
      }
    : daysSince !== null && daysSince >= 3
      ? {
          text: "Your skin is healing, not experimenting. Scan again to see how far it's come.",
          tone: "emerald",
        }
      : latest.stage === "compromised"
        ? {
            text: "Your skin isn't a science experiment. Pause the strong stuff and let it rest.",
            tone: "rose",
          }
        : latest.stage === "healing"
          ? { text: "You're healing. Resist the urge to try something new today.", tone: "amber" }
          : {
              text: "Great work. Add one new product at a time, so you always know what works.",
              tone: "emerald",
            };

  return (
    <section id="dashboard" className="mx-auto max-w-7xl px-4 pb-6 pt-20 sm:px-6 md:pt-24">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-emerald-400">
            {guest ? "DEMO GUEST" : "YOUR DASHBOARD"}
          </p>
          <h1 className="mt-2 font-display text-[clamp(26px,4vw,44px)] font-bold leading-tight tracking-tight">
            Welcome back{name ? `, ${name}` : ""}.
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {latest ? `Day ${trackingDay} of tracking your skin.` : "Let's take your first scan and start tracking."}
          </p>
        </div>
        <a
          href="#console"
          className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
        >
          <Camera className="h-4 w-4" /> {latest ? "New scan" : "Start first scan"}
        </a>
      </div>

      {loaded && (
        <p
          role="note"
          className={cn(
            "mt-6 rounded-xl border bg-slate-900/50 px-4 py-3 text-sm font-medium",
            TONE[reminder.tone].border,
            TONE[reminder.tone].text,
          )}
        >
          {reminder.text}
        </p>
      )}

      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        {/* Last session */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Last session</h2>
          {!loaded ? (
            <div className="mt-6 h-24 animate-pulse rounded-xl bg-slate-800/50" />
          ) : latest && stage ? (
            <>
              <div className="mt-4 flex items-center justify-between gap-3">
                <div>
                  <div className="font-display text-5xl font-bold tabular-nums">{latest.metrics.shieldScore}</div>
                  <div className="text-[11px] uppercase tracking-wider text-slate-500">Skin Shield Score</div>
                </div>
                <span className={cn("rounded-full px-3 py-1 text-xs font-medium ring-1", TONE[stage.tone].badge)}>
                  {stage.label}
                </span>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3">
                <Stat label="Redness" value={latest.metrics.redness} unit="%" />
                <Stat label="Flaking" value={latest.metrics.roughness} unit="%" />
                <Stat label="Moisture" value={latest.metrics.hydration} unit="%" />
              </div>
              <p className="mt-4 text-xs text-slate-500">
                Day {latest.dayNumber} ·{" "}
                {new Date(latest.timestamp).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </>
          ) : (
            <p className="mt-6 text-sm text-slate-400">No sessions yet. Your first scan will show up here.</p>
          )}
        </div>

        {/* Weekly progress */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 lg:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Weekly progress</h2>
            {weekDelta !== null && (
              <span className="flex items-center gap-2 text-xs text-slate-400">
                Score this week <Delta diff={weekDelta} higherIsBetter />
              </span>
            )}
          </div>
          <div
            className="mt-5 flex h-40 items-end gap-2 sm:gap-3"
            role="img"
            aria-label="Skin Shield Score for each of the last 7 days"
          >
            {week.map((d, i) => {
              const score = d.scan?.metrics.shieldScore ?? null;
              const tone = d.scan ? TONE[STAGE[d.scan.stage].tone] : null;
              return (
                <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                  <span className="font-mono text-[11px] tabular-nums text-slate-400">{score ?? ""}</span>
                  <div className="relative w-full flex-1">
                    <div
                      className={cn("absolute inset-x-0 bottom-0 rounded-t-md transition-all duration-700", tone ? tone.bar : "bg-slate-800")}
                      style={{
                        height: score === null ? "6%" : `${Math.max(score, 4)}%`,
                        opacity: score === null ? 0.5 : 1,
                      }}
                    />
                  </div>
                  <span className={cn("text-[11px]", i === 6 ? "font-semibold text-slate-200" : "text-slate-500")}>
                    {d.label}
                  </span>
                </div>
              );
            })}
          </div>
          {weekScans.length === 0 && (
            <p className="mt-3 text-xs text-slate-500">No scans in the last 7 days. Scan today to start your week.</p>
          )}
        </div>
      </div>

      {/* Next step */}
      {loaded && latest && daysSince !== null && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <div className="flex items-center gap-3 text-sm text-slate-300">
            <CalendarClock className="h-5 w-5 shrink-0 text-emerald-400" />
            {daysSince === 0
              ? "You scanned today. Check back tomorrow to see how your skin is healing."
              : daysSince === 1
                ? "Your last scan was yesterday. A new scan today keeps your week on track."
                : `Your last scan was ${daysSince} days ago. Time for a new one.`}
          </div>
          <a href="#console" className="text-sm font-semibold text-emerald-300 hover:text-emerald-200">
            Scan now
          </a>
        </div>
      )}
    </section>
  );
}
