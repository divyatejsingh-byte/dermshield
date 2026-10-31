"use client";

import { useEffect, useState } from "react";
import { Loader2, Lock, ShieldCheck, ShoppingBag } from "lucide-react";
import { cn, inr } from "@/lib/utils";
import type { CommerceState, MarketProduct, MarketplaceResponse } from "@/types/dermshield";
import ProductCard from "./ProductCard";

function LockedPreview({ products }: { products: MarketProduct[] }) {
  return (
    <div className="mt-6 grid gap-4 text-left sm:grid-cols-2" aria-label="Products that unlock as your skin heals">
      {products.map((p) => {
        const best = p.listings.reduce((a, b) => (b.price < a.price ? b : a));
        return (
          <article key={p.id} className="relative overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
            <div className="flex gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.thumbnail} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover blur-[2px]" />
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wider text-slate-500">
                  {p.brand} · {p.size}
                </p>
                <h3 className="text-sm font-semibold leading-snug text-slate-100">{p.title}</h3>
              </div>
            </div>
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-200">
              <Lock className="h-3 w-3" /> Unlocks at Skin Shield Score {p.phase === 1 ? 50 : 75}
            </span>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {p.listings.map((l) => (
                <span
                  key={l.merchant}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-medium ring-1",
                    l === best
                      ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/40"
                      : "bg-slate-800/70 text-slate-300 ring-slate-700",
                  )}
                >
                  {l.merchant}: {inr(l.price)}
                  {l === best && p.listings.length > 1 ? " · Best price" : ""}
                </span>
              ))}
            </div>
          </article>
        );
      })}
    </div>
  );
}

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
  const [channel, setChannel] = useState<"pharmacy" | "commercial">("pharmacy");
  const [reload, setReload] = useState(0);
  // While locked, show two blurred teaser cards with live prices so people see what unlocks.
  const [preview, setPreview] = useState<MarketProduct[] | null>(null);
  useEffect(() => {
    if (commerce.unlocked || preview) return;
    let cancelled = false;
    fetch("/api/marketplace?preview=1")
      .then((r) => (r.ok ? (r.json() as Promise<MarketplaceResponse>) : null))
      .then((d) => !cancelled && d && setPreview(d.products))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [commerce.unlocked, preview]);

  useEffect(() => {
    if (!commerce.unlocked) {
      setData(null);
      setFailed(null);
      return;
    }
    let cancelled = false;
    setData(null);
    setFailed(null);
    fetch(`/api/marketplace?channel=${channel}&score=${Math.round(score)}`)
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
    // Refetch when the tab, the unlock level or a manual retry changes (not on every small score move).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commerce.unlocked, commerce.tier, channel, reload]);

  if (!scanned) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-700 p-8 text-center" aria-labelledby="commerce-title">
        <h2 id="commerce-title" className="text-lg font-semibold text-slate-200">
          Safe Store
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-slate-400">
          Scan your skin first. We&apos;ll unlock gentle products once your skin is ready for them.
        </p>
        {preview && <LockedPreview products={preview} />}
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
        {preview && <LockedPreview products={preview} />}
      </section>
    );
  }

  const stores =
    channel === "pharmacy" ? "Tata 1mg, Apollo Pharmacy and Netmeds" : "Amazon.in, Flipkart and Nykaa";

  return (
    <section className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 sm:p-5" aria-labelledby="commerce-title">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/40">
            <ShieldCheck className="h-5 w-5 text-emerald-300" />
          </div>
          <div>
            <h2 id="commerce-title" className="font-semibold text-emerald-100">
              {commerce.tier === "full" ? "All Gentle Care Unlocked" : "Phase 1 Soothing Unlocked"}
            </h2>
            <p className="text-sm text-emerald-100/70">
              {commerce.tier === "full"
                ? `Your skin's shield is fully restored. Gentle formulas with live prices from ${stores}.`
                : `Your redness has settled and your skin's shield is coming back. Soothing formulas with live prices from ${stores}. More unlock as you heal.`}
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
          <ShoppingBag className="h-3.5 w-3.5" />
          {data ? "Live prices" : failed ? "Prices unavailable" : "Finding the best prices"}
        </span>
      </div>

      {/* Pharmacy vs brands */}
      <div
        role="tablist"
        aria-label="Product type"
        className="mb-2 grid grid-cols-2 gap-1 rounded-full border border-slate-700 bg-slate-950/60 p-1 text-sm font-semibold sm:inline-grid"
      >
        {(
          [
            ["pharmacy", "🏥 Pharmacy Essentials (Generic)"],
            ["commercial", "✨ Commercial Brands"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={channel === key}
            onClick={() => setChannel(key)}
            className={cn(
              "rounded-full px-4 py-2 text-center transition",
              channel === key
                ? "bg-emerald-500 text-slate-950 shadow"
                : "text-slate-300 hover:text-slate-100",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="mb-5 text-xs text-slate-400" aria-live="polite">
        {channel === "pharmacy"
          ? "Simple pharmacy formulations from Indian pharma brands (like Oryza from Alembic), usually much cheaper per gram than big brands."
          : "Popular consumer derm-tested brands (CeraVe, Cetaphil, Minimalist, La Roche-Posay, Avène)."}
      </p>

      {!data && !failed && (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading products...
        </div>
      )}
      {failed && (
        <p className="py-8 text-center text-sm text-rose-300">
          {failed}{" "}
          <button className="underline" onClick={() => setReload((n) => n + 1)}>
            Retry
          </button>
        </p>
      )}
      {data && (
        <div key={data.channel} className="grid animate-fade-up gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
      {data && channel === "pharmacy" && data.products.some((p) => p.savings) && (
        <p className="mt-3 text-center text-[11px] text-slate-500">
          Savings compare the same amount (per gram or ml) against {data.products.find((p) => p.savings)?.savings?.versus} at
          today&apos;s prices. Check the pack size before you buy.
        </p>
      )}
    </section>
  );
}
