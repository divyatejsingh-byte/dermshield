"use client";

import { useState } from "react";
import { ExternalLink, Star, Tag } from "lucide-react";
import { cn, inr } from "@/lib/utils";
import type { MarketProduct, Merchant } from "@/types/dermshield";

const MERCHANT_STYLE: Record<Merchant, string> = {
  "Amazon.in": "data-[on=true]:bg-amber-500/20 data-[on=true]:text-amber-200 data-[on=true]:ring-amber-500/50",
  Flipkart: "data-[on=true]:bg-sky-500/20 data-[on=true]:text-sky-200 data-[on=true]:ring-sky-500/50",
  Nykaa: "data-[on=true]:bg-pink-500/20 data-[on=true]:text-pink-200 data-[on=true]:ring-pink-500/50",
};

export default function ProductCard({ product }: { product: MarketProduct }) {
  const cheapest = product.listings.reduce((a, b) => (b.price < a.price ? b : a));
  const [selected, setSelected] = useState<Merchant>(cheapest.merchant);
  const listing = product.listings.find((l) => l.merchant === selected) ?? cheapest;

  return (
    <article className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/60 p-4 transition hover:border-emerald-500/40">
      <div className="flex gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.thumbnail}
          alt={product.title}
          className="h-20 w-20 shrink-0 rounded-xl border border-slate-800 object-cover"
        />
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-slate-500">
            {product.brand} · {product.size}
          </p>
          <h3 className="text-sm font-semibold leading-snug text-slate-100">{product.title}</h3>
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-400">{product.benefit}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {product.tags.map((t) => (
          <span key={t} className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-300">
            {t}
          </span>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5" role="tablist" aria-label="Store">
        {product.listings.map((l) => (
          <button
            key={l.merchant}
            role="tab"
            aria-selected={selected === l.merchant}
            data-on={selected === l.merchant}
            onClick={() => setSelected(l.merchant)}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium text-slate-400 ring-1 ring-slate-700 transition hover:text-slate-200",
              MERCHANT_STYLE[l.merchant],
            )}
          >
            {l.merchant}
          </button>
        ))}
      </div>

      <div className="mt-auto pt-4">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-xl font-semibold tabular-nums text-slate-50">{inr(listing.price)}</div>
            {listing.merchant === cheapest.merchant && (
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                <Tag className="h-3 w-3" /> Best price
              </span>
            )}
          </div>
          {listing.rating > 0 && (
            <div className="flex items-center gap-1 text-xs text-slate-300">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              {listing.rating.toFixed(1)}
              {listing.reviews > 0 && (
                <span className="text-slate-500">({listing.reviews.toLocaleString("en-IN")})</span>
              )}
            </div>
          )}
        </div>
        <a
          href={listing.url}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-medium text-slate-950 transition hover:bg-emerald-400"
        >
          View on {listing.merchant} <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </article>
  );
}
