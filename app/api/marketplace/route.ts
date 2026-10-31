import { NextResponse } from "next/server";
import { commerceState, stageForScore } from "@/lib/shieldEngine";
import type {
  MarketListing,
  MarketProduct,
  MarketplaceResponse,
  Merchant,
} from "@/types/dermshield";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MERCHANTS: Merchant[] = ["Amazon.in", "Flipkart", "Nykaa"];

const searchUrl = (m: Merchant, q: string) => {
  const e = encodeURIComponent(q);
  if (m === "Amazon.in") return `https://www.amazon.in/s?k=${e}`;
  if (m === "Flipkart") return `https://www.flipkart.com/search?q=${e}`;
  return `https://www.nykaa.com/search/result/?q=${e}`;
};

/** Self-contained SVG product art (no external image dependency). */
function thumb(hue: number, shape: "tube" | "jar" | "bottle"): string {
  const body =
    shape === "tube"
      ? `<path d="M38 22h44l-6 78H44z" fill="hsl(${hue} 55% 82%)"/><rect x="42" y="12" width="36" height="14" rx="4" fill="hsl(${hue} 30% 30%)"/><rect x="46" y="48" width="28" height="22" rx="3" fill="white" opacity=".85"/>`
      : shape === "jar"
        ? `<rect x="26" y="34" width="68" height="56" rx="10" fill="hsl(${hue} 55% 82%)"/><rect x="22" y="22" width="76" height="18" rx="6" fill="hsl(${hue} 30% 30%)"/><rect x="38" y="52" width="44" height="22" rx="3" fill="white" opacity=".85"/>`
        : `<rect x="40" y="30" width="40" height="70" rx="9" fill="hsl(${hue} 55% 82%)"/><rect x="50" y="12" width="20" height="22" rx="4" fill="hsl(${hue} 30% 30%)"/><rect x="45" y="56" width="30" height="24" rx="3" fill="white" opacity=".85"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="14" fill="hsl(${hue} 30% 14%)"/>${body}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

interface Seed {
  id: string;
  query: string;
  title: string;
  brand: string;
  size: string;
  /** Lower-case word the listing title must contain */
  match: string;
  benefit: string;
  phase: 1 | 2;
  tags: string[];
  thumbnail: string;
}

const SEEDS: Seed[] = [
  {
    id: "lrp-cicaplast",
    match: "cicaplast",
    query: "La Roche-Posay Cicaplast Baume B5+ 40ml",
    title: "La Roche-Posay Cicaplast Baume B5+ Soothing Repair Balm",
    brand: "La Roche-Posay",
    size: "40 ml",
    benefit: "Panthenol + madecassoside calm redness and help your skin heal faster.",
    phase: 1,
    tags: ["Panthenol", "Madecassoside", "Fragrance-free"],
    thumbnail: thumb(165, "tube"),
  },
  {
    id: "avene-cicalfate",
    match: "cicalfate",
    query: "Avene Cicalfate+ Restorative Protective Cream 40ml",
    title: "Avène Cicalfate+ Restorative Protective Cream",
    brand: "Avène",
    size: "40 ml",
    benefit: "Thermal-water based shield for irritated, over-treated skin.",
    phase: 1,
    tags: ["Sucralfate", "Thermal water", "Post-treatment"],
    thumbnail: thumb(28, "tube"),
  },
  {
    id: "cerave-moisturising",
    match: "moisturi",
    query: "CeraVe Moisturising Cream 340g",
    title: "CeraVe Moisturising Cream with Ceramides & Hyaluronic Acid",
    brand: "CeraVe",
    size: "340 g",
    benefit: "3 essential ceramides help restore your natural shield and lock in water.",
    phase: 2,
    tags: ["Ceramides", "Hyaluronic acid", "Non-comedogenic"],
    thumbnail: thumb(200, "jar"),
  },
  {
    id: "bioderma-atoderm",
    match: "atoderm",
    query: "Bioderma Atoderm Intensive Baume 500ml",
    title: "Bioderma Atoderm Intensive Baume Ultra-Soothing Balm",
    brand: "Bioderma",
    size: "500 ml",
    benefit: "Rich, soothing balm that strengthens your skin's natural protection on dry, sensitive skin.",
    phase: 2,
    tags: ["Emollient", "Fragrance-free", "Dry skin"],
    thumbnail: thumb(275, "bottle"),
  },
];

const pick = (s: Seed) => ({
  id: s.id,
  title: s.title,
  brand: s.brand,
  size: s.size,
  benefit: s.benefit,
  phase: s.phase,
  tags: s.tags,
  thumbnail: s.thumbnail,
});

/* ----------------------------- SerpApi ------------------------------ */

interface SerpResult {
  title?: string;
  source?: string;
  extracted_price?: number;
  rating?: number;
  reviews?: number;
  product_link?: string;
  link?: string;
}

function merchantFromSource(source = ""): Merchant | null {
  const s = source.toLowerCase();
  if (s.includes("amazon")) return "Amazon.in";
  if (s.includes("flipkart")) return "Flipkart";
  if (s.includes("nykaa")) return "Nykaa";
  return null;
}

async function liveListings(seed: Seed, apiKey: string): Promise<MarketListing[]> {
  const params = new URLSearchParams({
    engine: "google_shopping",
    q: seed.query,
    gl: "in",
    hl: "en",
    google_domain: "google.co.in",
    api_key: apiKey,
  });
  const res = await fetch(`https://serpapi.com/search.json?${params}`, {
    signal: AbortSignal.timeout(7000),
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`SerpApi ${res.status}`);
  const data = (await res.json()) as { shopping_results?: SerpResult[] };

  const found = new Map<Merchant, MarketListing>();
  for (const r of data.shopping_results ?? []) {
    const merchant = merchantFromSource(r.source);
    if (!merchant || found.has(merchant) || !r.extracted_price) continue;
    // Skip look-alikes: the title must name the product line, and any pack size it states must match.
    const title = (r.title ?? "").toLowerCase();
    if (!title.includes(seed.match)) continue;
    const sized = title.match(/(\d+)\s?(?:ml|gm|g)\b/);
    if (sized && sized[1] !== seed.size.replace(/[^0-9]/g, "")) continue;
    found.set(merchant, {
      merchant,
      price: r.extracted_price,
      rating: r.rating ?? 0,
      // SerpApi sometimes returns thousands as a decimal (1.4 meaning 1.4K).
      reviews: r.reviews && r.reviews < 10 && !Number.isInteger(r.reviews) ? Math.round(r.reviews * 1000) : (r.reviews ?? 0),
      url: r.product_link ?? r.link ?? searchUrl(merchant, seed.query),
    });
  }
  return Array.from(found.values());
}

export async function GET(req: Request) {
  // The Shield Score decides what may be sold: the engine, not the client, gates the store.
  const score = Number(new URL(req.url).searchParams.get("score"));
  if (!Number.isFinite(score)) {
    return NextResponse.json({ error: "A Skin Shield Score is required." }, { status: 400 });
  }
  const commerce = commerceState(stageForScore(score));
  if (!commerce.unlocked || commerce.tier === "none") {
    return NextResponse.json(
      { error: "Purchases are paused until your Skin Shield Score reaches 50." },
      { status: 403 },
    );
  }
  const tier = commerce.tier;
  const seeds = SEEDS.filter((s) => tier === "full" || s.phase === 1);

  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Live prices aren't configured (SERPAPI_API_KEY is missing)." }, { status: 503 });
  }

  const results = await Promise.all(
    seeds.map(async (seed): Promise<MarketProduct | null> => {
      try {
        const listings = await liveListings(seed, apiKey);
        if (listings.length === 0) return null;
        return { ...pick(seed), listings };
      } catch (err) {
        console.warn("[marketplace] SerpApi failed:", (err as Error).message);
        return null;
      }
    }),
  );
  const products = results.filter((p): p is MarketProduct => p !== null);
  if (products.length === 0) {
    return NextResponse.json({ error: "Couldn't load live prices right now. Please try again." }, { status: 502 });
  }

  const body: MarketplaceResponse = { source: "serpapi", tier, products };
  return NextResponse.json(body);
}
