"use client";

import Link from "next/link";
import BiometricsPanel from "../BiometricsPanel";
import Header from "../Header";
import PageShell from "../PageShell";
import ShelfAuditor from "../ShelfAuditor";
import { useApp } from "../AppProvider";

export default function ScanView() {
  const a = useApp();

  return (
    <PageShell
      eyebrow={a.authed ? "NEW SCAN" : "YOUR SKIN CHECK"}
      title="Check your skin"
      intro="Add a clear, front-facing photo. Your readings, product audit and healing timeline all update from it."
    >
      <div className="space-y-6">
        {a.demoProfile && (
          <p role="status" className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
            Demo profile: these are sample results for an over-exfoliated face, not your skin. Upload a photo or take a
            selfie to replace them with your own.
          </p>
        )}
        {a.shield && <Header score={a.shield.score} stage={a.shield.stage} />}
        <div className="grid gap-8 lg:grid-cols-2">
          <BiometricsPanel
            metrics={a.metrics}
            photoUrl={a.photoUrl}
            heatmap={a.heatmap}
            onToggleHeatmap={a.toggleHeatmap}
            onUpload={a.uploadPhoto}
            analyzing={a.analyzing}
            error={a.error}
          />
          <ShelfAuditor
            shelf={a.shelf}
            shield={a.shield}
            metrics={a.metrics}
            day={a.day}
            onToggle={a.toggleProduct}
            onAdd={a.addProduct}
            onRemove={a.removeProduct}
          />
        </div>

        {a.shield && (
          <nav aria-label="Next steps" className="flex flex-wrap gap-3 border-t border-slate-800 pt-6">
            <Link
              href="/audit"
              className="rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
            >
              See your product audit
            </Link>
            <Link
              href="/track"
              className="rounded-full border border-slate-600 px-5 py-2.5 text-sm font-semibold transition hover:border-emerald-500 hover:text-emerald-300"
            >
              Track your healing
            </Link>
            <Link
              href="/store"
              className="rounded-full border border-slate-600 px-5 py-2.5 text-sm font-semibold transition hover:border-emerald-500 hover:text-emerald-300"
            >
              Open the Safe Store
            </Link>
          </nav>
        )}
      </div>
    </PageShell>
  );
}
