"use client";

import { useState } from "react";
import { AlertTriangle, Bot, CheckCircle2, Lock, Plus, ScanBarcode, ShieldAlert, Trash2 } from "lucide-react";
import { CATEGORY_LABEL, QUARANTINE_LENGTH_DAYS, inferCategory } from "@/lib/shieldEngine";
import { cn } from "@/lib/utils";
import type { ActiveCategory, ShelfProduct, ShieldResult, SkinMetrics } from "@/types/dermshield";
import ProductScanner from "./ProductScanner";
import { QUICK_PRODUCTS } from "@/lib/quickProducts";

interface Props {
  shelf: ShelfProduct[];
  /** Null until the first face scan: products can be added before any scan, but not judged. */
  shield: ShieldResult | null;
  metrics: SkinMetrics | null;
  day: number;
  onToggle: (id: string) => void;
  onAdd: (name: string, active: string, category?: ActiveCategory) => void;
  onRemove: (id: string) => void;
}

export default function ShelfAuditor({ shelf, shield, metrics, day, onToggle, onAdd, onRemove }: Props) {
  const [name, setName] = useState("");
  const [active, setActive] = useState("");
  const [scanning, setScanning] = useState(false);
  const evaluation = shield?.evaluation ?? null;
  const verdictById = new Map((evaluation?.verdicts ?? []).map((v) => [v.product.id, v]));
  const inferred = active.trim() ? CATEGORY_LABEL[inferCategory(active)] : null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !active.trim()) return;
    onAdd(name.trim(), active.trim());
    setName("");
    setActive("");
  };

  return (
    <section className="space-y-4" aria-labelledby="shelf-title">
      <h2 id="shelf-title" className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
        <Bot className="h-4 w-4 text-emerald-400" /> {evaluation ? "Product Audit" : "Your Products"}
      </h2>

      {/* Audit summary card */}
      {evaluation && metrics ? (
      <div
        className={cn(
          "rounded-2xl border p-4 transition-colors",
          evaluation.conflict
            ? "border-rose-500/50 bg-rose-500/10"
            : evaluation.quarantineActive
              ? "border-amber-500/40 bg-amber-500/10"
              : "border-emerald-500/30 bg-emerald-500/5",
        )}
        role="status"
      >
        {evaluation.conflict ? (
          <div className="flex gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
            <div>
              <p className="font-semibold text-rose-200">Too many strong products at once.</p>
              <p className="mt-1 text-sm text-rose-100/80">
                Mixing harsh acids or retinols on raw skin can cause chemical burns. We&apos;ve paused them
                for 5 days so your skin can rest.
              </p>
              <p className="mt-2 text-xs text-rose-200/70">
                {evaluation.harshCount} harsh product{evaluation.harshCount > 1 ? "s" : ""} in your routine
                · Redness {Math.round(metrics.redness)}/100 · Score lowered by {evaluation.penalty} pts
              </p>
            </div>
          </div>
        ) : evaluation.quarantineActive ? (
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
            <div>
              <p className="font-semibold text-amber-200">Still resting</p>
              <p className="mt-1 text-sm text-amber-100/80">
                Your redness has settled, but harsh products stay paused until Day {QUARANTINE_LENGTH_DAYS}
                (today is Day {day}) so your skin&apos;s natural shield can fully recover.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
            <div>
              <p className="font-semibold text-emerald-200">Routine looks good</p>
              <p className="mt-1 text-sm text-emerald-100/80">
                {evaluation.harshCount > 1
                  ? "Your skin has healed. Restart strong products one at a time, never on the same night."
                  : "Nothing here is likely to irritate your skin right now."}
              </p>
            </div>
          </div>
        )}
      </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-slate-700 p-4 text-sm text-slate-400">
          Add the products you use now. After your face scan, we&apos;ll tell you which to keep and which to pause.
        </p>
      )}

      {/* Shelf */}
      {shelf.length === 0 && (
        <p className="text-xs text-slate-500">No products yet. Scan a barcode or add one below.</p>
      )}
      <ul className="space-y-2">
        {shelf.map((p) => {
          const v = verdictById.get(p.id);
          const quarantined = p.enabled && v?.status === "quarantined";
          return (
            <li
              key={p.id}
              className={cn(
                "rounded-xl border p-3 transition-colors",
                !p.enabled
                  ? "border-slate-800 bg-slate-900/30 opacity-60"
                  : quarantined
                    ? "border-rose-500/40 bg-rose-500/5"
                    : "border-slate-800 bg-slate-900/60",
              )}
            >
              <div className="flex items-start gap-3">
                <button
                  role="switch"
                  aria-checked={p.enabled}
                  aria-label={`Toggle ${p.name}`}
                  onClick={() => onToggle(p.id)}
                  className={cn(
                    "mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors",
                    p.enabled ? "bg-emerald-500" : "bg-slate-700",
                  )}
                >
                  <span
                    className={cn(
                      "h-4 w-4 rounded-full bg-white transition-transform",
                      p.enabled && "translate-x-4",
                    )}
                  />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-sm font-medium text-slate-100">{p.name}</span>
                    {p.enabled && v &&
                      (quarantined ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold tracking-wide text-rose-300 ring-1 ring-rose-500/50">
                          <Lock className="h-3 w-3" /> PAUSED (5 Days)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold tracking-wide text-emerald-300 ring-1 ring-emerald-500/50">
                          <CheckCircle2 className="h-3 w-3" /> SAFE TO KEEP
                        </span>
                      ))}
                  </div>
                  <p className="text-xs text-slate-400">
                    Main ingredient: {p.active} · <span className="text-slate-500">{CATEGORY_LABEL[p.category]}</span>
                  </p>
                  {p.enabled && v && <p className="mt-1 text-[11px] text-slate-500">{v.reason}</p>}
                </div>
                {(p.custom || !evaluation) && (
                  <button
                    onClick={() => onRemove(p.id)}
                    aria-label={`Remove ${p.name}`}
                    className="text-slate-500 hover:text-rose-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {/* Add custom */}
      <form onSubmit={submit} className="rounded-xl border border-dashed border-slate-700 p-3">
        {(shelf.length === 0 || !evaluation) && (
          <div className="mb-4">
            <p className="mb-2 text-xs uppercase tracking-wider text-slate-500">Quick add</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_PRODUCTS.map((q) => {
                const added = shelf.some((p) => p.name === q.name);
                return (
                  <button
                    key={q.label}
                    type="button"
                    disabled={added}
                    onClick={() => onAdd(q.name, q.active, q.category)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs transition",
                      added
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                        : "border-slate-700 text-slate-200 hover:border-emerald-500 hover:text-emerald-300",
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
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs uppercase tracking-wider text-slate-500">Add a product</p>
          <button
            type="button"
            onClick={() => setScanning(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/50 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/10"
          >
            <ScanBarcode className="h-3.5 w-3.5" /> Scan a product
          </button>
        </div>
        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Product name"
            aria-label="Product name"
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none placeholder:text-slate-600 focus:border-emerald-500"
          />
          <input
            value={active}
            onChange={(e) => setActive(e.target.value)}
            placeholder="Active (e.g. Glycolic Acid)"
            aria-label="Active ingredient"
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none placeholder:text-slate-600 focus:border-emerald-500"
          />
          <button
            type="submit"
            disabled={!name.trim() || !active.trim()}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-900 transition hover:bg-white disabled:opacity-40"
          >
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
        {inferred && (
          <p className="mt-2 text-[11px] text-slate-500">Agent classification: {inferred}</p>
        )}
      </form>
      {scanning && (
        <ProductScanner
          onClose={() => setScanning(false)}
          onPick={(name, active, category) => {
            onAdd(name, active, category);
            setScanning(false);
          }}
        />
      )}
    </section>
  );
}
