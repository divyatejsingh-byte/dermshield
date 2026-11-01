"use client";

import Link from "next/link";
import PageSkeleton from "../PageSkeleton";
import RecoveryEngine from "../landing/RecoveryEngine";
import TimelineScrubber from "../TimelineScrubber";
import { useSkin } from "@/context/SkinContext";

export default function TrackView() {
  const s = useSkin();
  if (!s.hydrated) return <PageSkeleton />;

  return (
    <div className="pt-14 md:pt-16">
      <RecoveryEngine baseline={s.baseline} day={s.day} onDay={s.changeDay} />
      <div id="simulator" className="mx-auto max-w-7xl scroll-mt-24 px-4 pb-12 sm:px-6 md:pb-20">
        {s.baseline ? (
          <TimelineScrubber
            day={s.day}
            onDay={s.changeDay}
            unlockedDay={s.unlockedDay}
            onAdvance={s.unlockedDay < 7 ? s.advanceDay : undefined}
          />
        ) : (
          <p className="rounded-2xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400">
            The healing simulator needs a scan to start from.{" "}
            <Link href="/scan" className="font-semibold text-emerald-400 hover:text-emerald-300">
              Check your skin
            </Link>{" "}
            or{" "}
            <button onClick={s.loadDemoProfile} className="font-semibold text-amber-300 hover:text-amber-200">
              load the demo profile
            </button>
            .
          </p>
        )}
      </div>
    </div>
  );
}
