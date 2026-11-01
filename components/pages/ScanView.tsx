"use client";

import Link from "next/link";
import { FlaskConical } from "lucide-react";
import BiometricsPanel from "../BiometricsPanel";
import Header from "../Header";
import PageShell from "../PageShell";
import PageSkeleton from "../PageSkeleton";
import ShelfAuditor from "../ShelfAuditor";
import { useSkin } from "@/context/SkinContext";

export default function ScanView() {
  const s = useSkin();
  if (!s.hydrated) return <PageSkeleton />;

  return (
    <PageShell
      eyebrow={s.authed ? "NEW SCAN" : "YOUR SKIN CHECK"}
      title="Check your skin"
      intro="Add a clear, front-facing photo. Your readings, product audit and healing timeline all update from it."
    >
      <div className="space-y-6">
        {!s.metrics.isScanned && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3">
            <p className="text-sm text-slate-400">No photo handy?</p>
            <button
              onClick={s.loadDemoProfile}
              className="inline-flex items-center gap-2 rounded-full border border-amber-400/50 px-4 py-2 text-xs font-semibold text-amber-300 transition hover:bg-amber-400/10"
            >
              <FlaskConical className="h-3.5 w-3.5" /> Try Demo Profile (Over-exfoliated / Retinol Burn)
            </button>
          </div>
        )}
        {s.demoProfile && (
          <p role="status" className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
            Demo profile: these are sample results for an over-exfoliated face, not your skin. Upload a photo or take a
            selfie to replace them with your own.
          </p>
        )}
        {s.shield && <Header score={s.shield.score} stage={s.shield.stage} />}
        <div className="grid gap-8 lg:grid-cols-2">
          <BiometricsPanel
            metrics={s.readings}
            photoUrl={s.photoUrl}
            heatmap={s.heatmap}
            onToggleHeatmap={s.toggleHeatmap}
            onUpload={s.uploadPhoto}
            analyzing={s.analyzing}
            error={s.error}
          />
          <ShelfAuditor
            shelf={s.shelf}
            shield={s.shield}
            metrics={s.readings}
            day={s.day}
            onToggle={s.toggleProduct}
            onAdd={(name, active, category) => s.addProductToAudit({ name, active, category })}
            onRemove={s.removeProductFromAudit}
          />
        </div>

        {s.shield && (
          <nav aria-label="Next steps" className="flex flex-wrap items-center gap-3 border-t border-slate-800 pt-6">
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

        {(s.metrics.isScanned || s.shelf.length > 0) && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4 text-xs text-slate-500">
            <span>
              {s.metrics.scanTimestamp
                ? `Last scan: ${new Date(s.metrics.scanTimestamp).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}. Saved on this device.`
                : "Saved on this device."}
            </span>
            <button
              onClick={() => {
                if (window.confirm("Clear your scan, products and history from this device?")) s.resetAllData();
              }}
              className="underline transition hover:text-rose-300"
            >
              Reset all data
            </button>
          </div>
        )}
      </div>
    </PageShell>
  );
}
