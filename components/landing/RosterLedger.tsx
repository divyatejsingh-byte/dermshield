"use client";

import { ShieldCheck } from "lucide-react";
import { HARSH_CATEGORIES, flushRisk, ledgerRows, type LedgerStatus } from "@/lib/shieldEngine";
import { QUICK_PRODUCTS } from "@/lib/quickProducts";
import { useAnimatedNumber } from "@/lib/useAnimatedNumber";
import { cn } from "@/lib/utils";
import type { ActiveCategory, ShieldResult, ShelfProduct, SkinMetrics } from "@/types/dermshield";

const STATUS_STYLE: Record<LedgerStatus, { label: string; cls: string }> = {
  within: { label: "Healthy", cls: "text-emerald-400" },
  elevated: { label: "Needs care", cls: "text-amber-400" },
  critical: { label: "Raw / Too high", cls: "text-rose-400" },
};

function Reading({ value }: { value: number }) {
  const v = useAnimatedNumber(value, 700);
  return <>{v.toFixed(1)} / 100</>;
}

interface Props {
  shelf: ShelfProduct[];
  shield: ShieldResult | null;
  metrics: SkinMetrics | null;
  onAdd: (name: string, active: string, category?: ActiveCategory) => void;
}

export default function RosterLedger({ shelf, shield, metrics, onAdd }: Props) {
  const verdicts = new Map((shield?.evaluation.verdicts ?? []).map((v) => [v.product.id, v]));
  const rows = shelf.filter((p) => p.enabled);
  // Before a scan the rows still list what we check and the healthy ranges, with no readings.
  const ledger = ledgerRows(metrics ?? { redness: 0, roughness: 0, hydration: 0 });

  return (
    <section className="px-5 py-12 md:px-16 md:py-24">
      {/* Roster */}
      <div id="roster" className="scroll-mt-20">
        <p className="mb-8 font-mono text-[11px] uppercase tracking-[0.22em] text-emerald-400">
          AUDIT YOUR PRODUCTS
        </p>
        <h2 className="mb-8 max-w-3xl font-display text-[clamp(28px,4vw,56px)] font-bold leading-[1.05] tracking-tight">
          Know what&apos;s safe to keep—and what to put away.
        </h2>
        {rows.length === 0 && (
          <div className="flex flex-col items-start gap-5 rounded-2xl border border-slate-800 bg-slate-900/40 p-6 md:flex-row md:items-center md:justify-between md:p-8">
            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/30">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
              </span>
              <div>
                <h3 className="font-display text-xl font-semibold">
                  {metrics ? "Add the products you use" : "Your product check starts with a scan"}
                </h3>
                <p className="mt-1 max-w-lg text-sm text-slate-400">
                  {metrics
                    ? "Add your cleanser, serums and creams in the skin check below. We'll tell you which to keep and which to pause."
                    : "Scan your skin first. Then add your products and we'll tell you which to keep and which to pause."}
                </p>
              </div>
            </div>
            <a
              href="#console"
              className="shrink-0 rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
            >
              {metrics ? "Add Products" : "Check My Skin"}
            </a>
          </div>
        )}
        {(rows.length === 0 || !metrics) && (
          <div className="mb-6 mt-5">
            <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Quick add: tap the products you use
            </p>
            <div className="flex flex-wrap gap-2">
              {QUICK_PRODUCTS.map((q) => {
                const added = shelf.some((p) => p.name === q.name);
                return (
                  <button
                    key={q.label}
                    onClick={() => !added && onAdd(q.name, q.active, q.category)}
                    disabled={added}
                    className={cn(
                      "rounded-full border px-3.5 py-2 text-sm transition",
                      added
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                        : "border-slate-700 bg-slate-900/60 text-slate-200 hover:border-emerald-500 hover:text-emerald-300",
                    )}
                  >
                    {added ? "✓ " : "+ "}
                    {q.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {rows.length > 0 && (
        <ul className="border-t border-slate-800">
          {rows.map((p) => {
            // Before a scan the tag is provisional: strong actives are assumed paused until your skin says otherwise.
            const quarantined = metrics
              ? verdicts.get(p.id)?.status === "quarantined"
              : HARSH_CATEGORIES.has(p.category);
            const risk = metrics ? flushRisk(p, metrics) : null;
            return (
              <li
                key={p.id}
                className="grid items-center gap-x-6 gap-y-1 border-b border-slate-800 py-5 md:grid-cols-[170px_1fr_auto]"
              >
                <span
                  className={cn(
                    "w-fit rounded-full px-3 py-1 text-[10.5px] font-bold uppercase tracking-[0.14em] ring-1",
                    quarantined
                      ? "bg-amber-500/15 text-amber-400 ring-amber-500/50"
                      : "bg-emerald-500/15 text-emerald-400 ring-emerald-500/40",
                  )}
                >
                  {quarantined ? "PAUSED (5 Days)" : "SAFE TO KEEP"}
                </span>
                <div>
                  <span
                    className={cn(
                      "font-display text-xl font-semibold tracking-tight md:text-2xl",
                      quarantined && "text-slate-400 line-through decoration-rose-500/50",
                    )}
                  >
                    {p.name}
                  </span>
                  <p className="mt-1 text-sm text-slate-500">
                    {metrics ? verdicts.get(p.id)?.reason : "Provisional. Scan your skin to confirm."}
                  </p>
                </div>
                <span
                  className={cn(
                    "text-xs font-medium uppercase tracking-wider md:text-right",
                    risk === null ? "text-slate-500" : risk > 0 ? "text-rose-300" : "text-emerald-300",
                  )}
                >
                  {risk === null
                    ? "Scan to see irritation risk"
                    : `${risk > 0 ? "+" : risk < 0 ? "−" : ""}${Math.abs(risk)}% irritation risk`}
                </span>
              </li>
            );
          })}
        </ul>
        )}
      </div>

      {/* Ledger */}
      <div id="ledger" className="mt-28 scroll-mt-24">
        <p className="mb-8 font-mono text-[11px] uppercase tracking-[0.22em] text-emerald-400">
          YOUR SKIN NUMBERS
        </p>
        {!metrics && (
          <p className="-mt-3 mb-6 max-w-xl text-sm text-slate-400">
            Here&apos;s what we check and the healthy range for each. Your readings fill in after your first scan.
          </p>
        )}
        <div role="table" aria-label="Your skin numbers">
          <div
            role="row"
            className="hidden border-b border-slate-700 pb-3 font-mono text-[10.5px] uppercase tracking-[0.18em] text-slate-500 md:grid md:grid-cols-4"
          >
            {["What we check", "Your reading", "Healthy range", "Status"].map((h) => (
              <span key={h} role="columnheader">
                {h}
              </span>
            ))}
          </div>
          <div className="grid gap-3 md:block">
            {ledger.map((r) => (
              <div
                key={r.key}
                role="row"
                className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-slate-800 p-4 md:grid-cols-4 md:items-center md:rounded-none md:border-0 md:border-b md:px-0 md:py-5"
              >
                <span
                  role="cell"
                  className="col-span-2 font-display text-lg font-semibold md:col-span-1"
                >
                  {r.label}
                </span>
                <Cell label="Your reading">
                  {metrics ? <Reading value={r.value} /> : <span className="text-slate-500">—</span>}
                </Cell>
                <Cell label="Healthy range">{r.tolerance}</Cell>
                <Cell label="Status" className={metrics ? STATUS_STYLE[r.status].cls : "text-slate-500"}>
                  {metrics ? STATUS_STYLE[r.status].label : "Waiting for scan"}
                </Cell>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Cell({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div role="cell" className="flex flex-col gap-1 font-mono text-sm md:block">
      <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500 md:hidden">{label}</span>
      <span className={cn("text-slate-200", className)}>{children}</span>
    </div>
  );
}
