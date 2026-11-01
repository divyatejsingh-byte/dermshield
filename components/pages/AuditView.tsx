"use client";

import { useEffect, useState } from "react";
import { Camera, CheckCircle2, ShieldAlert, X } from "lucide-react";
import BottleScanner from "../BottleScanner";
import PageShell from "../PageShell";
import PageSkeleton from "../PageSkeleton";
import RosterLedger from "../landing/RosterLedger";
import ShelfAuditor from "../ShelfAuditor";
import { cn } from "@/lib/utils";
import { useSkin } from "@/context/SkinContext";
import type { BottleResult } from "@/lib/bottleLabel";

interface Added {
  id: string | null;
  result: BottleResult;
  offline: boolean;
  duplicate: boolean;
}

export default function AuditView() {
  const s = useSkin();
  const [scanOpen, setScanOpen] = useState(false);
  const [added, setAdded] = useState<Added | null>(null);

  // The toast fades on its own, but stays until read if someone is mid-scroll.
  useEffect(() => {
    if (!added) return;
    const t = window.setTimeout(() => setAdded(null), 14_000);
    return () => window.clearTimeout(t);
  }, [added]);

  if (!s.hydrated) return <PageSkeleton />;

  const add = (name: string, active: string, category?: Parameters<typeof s.addProductToAudit>[0]["category"]) =>
    s.addProductToAudit({ name, active, category });

  const onLabelRead = (result: BottleResult, meta: { offline: boolean }) => {
    const duplicate = s.shelf.some((p) => p.name.toLowerCase() === result.productName.toLowerCase());
    const id = duplicate
      ? null
      : s.addProductToAudit({
          name: result.productName,
          active: result.primaryActives.join(" + ") || result.productName,
          category: result.shelfCategory,
        });
    setAdded({ id, result, offline: meta.offline, duplicate });
    setScanOpen(false);
  };

  // How the audit actually judged it (its rules are the final word), plus the label reader's reason.
  const judged = added?.id ? s.auditedProducts.find((p) => p.id === added.id) : undefined;
  const paused = judged ? judged.status === "paused" : added?.result.status === "paused";
  const days = judged?.cooldownDays ?? added?.result.cooldownDays ?? 5;

  const scanButton = (
    <button
      onClick={() => setScanOpen(true)}
      className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400"
    >
      <Camera className="h-4 w-4" /> Scan Bottle Label
    </button>
  );

  return (
    <>
      {added && (
        <div className="pointer-events-none fixed inset-x-0 top-[70px] z-[45] flex justify-center px-3">
          <div
            role="status"
            aria-live="polite"
            className={cn(
              "pointer-events-auto flex w-full max-w-xl items-start gap-3 rounded-2xl border p-4 shadow-2xl backdrop-blur",
              added.duplicate
                ? "border-slate-600 bg-slate-900/95"
                : paused
                  ? "border-amber-400/50 bg-slate-900/95"
                  : "border-emerald-500/50 bg-slate-900/95",
            )}
          >
            {paused && !added.duplicate ? (
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
            ) : (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
            )}
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-semibold text-slate-100">
                {added.duplicate
                  ? `${added.result.productName} is already in your audit.`
                  : `Detected: ${added.result.productName} — ${
                      paused ? `Paused for ${days} days` : "Safe to keep"
                    }`}
              </p>
              {!added.duplicate && (
                <p className="mt-1 leading-relaxed text-slate-300">
                  {added.result.reason}
                  {added.result.status === "safe" && paused
                    ? " Your recovery plan keeps strong actives paused until your skin has settled."
                    : ""}
                </p>
              )}
              {added.result.primaryActives.length > 0 && (
                <p className="mt-1.5 text-xs text-slate-400">Actives: {added.result.primaryActives.join(", ")}</p>
              )}
              {added.offline && (
                <p className="mt-1.5 text-xs text-amber-300">Offline sample result: live label reading isn&apos;t available right now.</p>
              )}
            </div>
            <button
              onClick={() => setAdded(null)}
              aria-label="Dismiss"
              className="rounded-full p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="pt-14 md:pt-16">
        <RosterLedger
          shelf={s.shelf}
          shield={s.shield}
          metrics={s.readings}
          onAdd={add}
          onLoadDemo={s.loadDemoProfile}
          onScanLabel={() => setScanOpen(true)}
        />
      </div>
      <PageShell eyebrow="MANAGE YOUR PRODUCTS" title="Your routine, checked">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          {scanButton}
          <p className="text-sm text-slate-400">Snap the ingredient list on the back of any bottle.</p>
        </div>
        <div id="manage-products" className="max-w-3xl scroll-mt-24">
          <ShelfAuditor
            shelf={s.shelf}
            shield={s.shield}
            metrics={s.readings}
            day={s.day}
            onToggle={s.toggleProduct}
            onAdd={add}
            onRemove={s.removeProductFromAudit}
          />
        </div>
      </PageShell>

      {scanOpen && (
        <BottleScanner
          redness={s.metrics.isScanned ? s.metrics.redness : null}
          existing={s.shelf.map((p) => ({ name: p.name }))}
          onResult={onLabelRead}
          onClose={() => setScanOpen(false)}
        />
      )}
    </>
  );
}
