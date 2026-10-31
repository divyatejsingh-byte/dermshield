"use client";

import Link from "next/link";
import RecoveryEngine from "../landing/RecoveryEngine";
import TimelineScrubber from "../TimelineScrubber";
import { useApp } from "../AppProvider";

export default function TrackView() {
  const a = useApp();
  return (
    <div className="pt-14 md:pt-16">
      <RecoveryEngine baseline={a.baseline} day={a.day} onDay={a.changeDay} />
      <div id="simulator" className="mx-auto max-w-7xl scroll-mt-24 px-4 pb-12 sm:px-6 md:pb-20">
        {a.baseline ? (
          <TimelineScrubber
            day={a.day}
            onDay={a.changeDay}
            unlockedDay={a.unlockedDay}
            onAdvance={a.unlockedDay < 7 ? a.advanceDay : undefined}
          />
        ) : (
          <p className="rounded-2xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400">
            The healing simulator needs a scan to start from.{" "}
            <Link href="/scan" className="font-semibold text-emerald-400 hover:text-emerald-300">
              Check your skin
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
