"use client";

import { useEffect, useState } from "react";
import { Loader2, Lock, ShieldCheck, ShoppingBag } from "lucide-react";
import type { CommerceState, MarketplaceResponse } from "@/types/dermshield";
import ProductCard from "./ProductCard";

export default function CommerceSection({
  commerce,
  score,
  scanned,
}: {
  commerce: CommerceState;
  score: number;
  scanned: boolean;
}) {
  const [data, setData] = useState<MarketplaceResponse | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    if (!commerce.unlocked) {
      setData(null);
      setFailed(null);
      return;
    }
    if (data?.tier === commerce.tier || failed) return;
    let cancelled = false;
    fetch(`/api/marketplace?score=${Math.round(score)}`)
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error((body as { error?: string }).error ?? "Could not load products.");
        return body as MarketplaceResponse;
      })
      .then((d) => !cancelled && setData(d))
      .catch((e: Error) => !cancelled && setFailed(e.message));
    return () => {
      cancelled = true;
    };
  }, [commerce.unlocked, commerce.tier, score, data, failed]);

  if (!scanned) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-700 p-8 text-center" aria-labelledby="commerce-title">
        <h2 id="commerce-title" className="text-lg font-semibold text-slate-200">
          Safe Store
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-slate-400">
          Scan your skin first. We&apos;ll unlock gentle products once your skin is ready for them.
        </p>
      </section>
    );
  }

  if (!commerce.unlocked) {
    return (
      <section
        className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-8 text-center"
        aria-labelledby="commerce-title"
      >
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/15 ring-1 ring-rose-500/40">
          <Lock className="h-7 w-7 text-rose-300" />
        </div>
        <h2 id="commerce-title" className="text-lg font-semibold text-rose-100">
          Purchases Paused
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-rose-100/70">
          Your skin is too sensitive right now. Let your face rest for 3 to 5 days before putting
          anything new on it.
        </p>
        <p className="mt-3 text-xs text-slate-500">
          The Safe Store opens in two steps: soothing care at a Skin Shield Score of 50, everything at 75.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5" aria-labelledby="commerce-title">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/40">
            <ShieldCheck className="h-5 w-5 text-emerald-300" />
          </div>
          <div>
            <h2 id="commerce-title" className="font-semibold text-emerald-100">
              {commerce.tier === "full" ? "All Gentle Care Unlocked" : "Phase 1 Soothing Unlocked"}
            </h2>
            <p className="text-sm text-emerald-100/70">
              {commerce.tier === "full"
                ? "Your skin's shield is fully restored. Here are all our verified gentle formulas matched from Amazon, Flipkart, and Nykaa."
                : "Your redness has settled and your skin's shield is coming back. Here are verified soothing formulas matched from Amazon, Flipkart, and Nykaa. More unlock as you heal."}
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
          <ShoppingBag className="h-3.5 w-3.5" />
          {data ? "Live prices" : failed ? "Prices unavailable" : "Finding the best prices"}
        </span>
      </div>

      {!data && !failed && (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading products...
        </div>
      )}
      {failed && (
        <p className="py-8 text-center text-sm text-rose-300">
          {failed}{" "}
          <button className="underline" onClick={() => setFailed(null)}>
            Retry
          </button>
        </p>
      )}
      {data && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {data.products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
      {data && commerce.tier === "soothing" && (
        <p className="mt-4 text-center text-xs text-slate-500">
          Richer moisturisers unlock when your Skin Shield Score reaches 75.
        </p>
      )}
    </section>
  );
}
