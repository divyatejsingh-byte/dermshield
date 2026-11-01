import { NextResponse } from "next/server";
import { commerceState, stageForScore } from "@/lib/shieldEngine";
import { CATALOG, type CatalogItem, type Channel } from "@/lib/storeCatalog";
import type { MarketListing, MarketProduct, MarketplaceResponse, Merchant } from "@/types/dermshield";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Retailers shown per channel. */
const MERCHANTS: Record<Channel, Merchant[]> = {
  commercial: ["Amazon.in", "Flipkart", "Nykaa"],
  pharmacy: ["Tata 1mg", "Apollo Pharmacy", "Netmeds"],
};

const searchUrl = (m: Merchant, q: string) => {
  const e = encodeURIComponent(q);
  switch (m) {
    case "Amazon.in":
      return `https://www.amazon.in/s?k=${e}`;
    case "Flipkart":
      return `https://www.flipkart.com/search?q=${e}`;
    case "Nykaa":
      return `https://www.nykaa.com/search/result/?q=${e}`;
    case "Tata 1mg":
      return `https://www.1mg.com/search/all?name=${e}`;
    case "Apollo Pharmacy":
      return `https://www.apollopharmacy.in/search-medicines/${e}`;
    default:
      return `https://www.netmeds.com/catalogsearch/result/${e}/all`;
  }
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

const pick = (s: CatalogItem): Omit<MarketProduct, "listings"> => ({
  id: s.id,
  channel: s.channel,
  title: s.title,
  brand: s.brand,
  size: s.size,
  benefit: s.benefit,
  activeTag: s.activeTag,
  phase: s.phase,
  tags: s.tags,
  thumbnail: thumb(s.art.hue, s.art.shape),
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

function merchantFromSource(channel: Channel, source = ""): Merchant | null {
  const s = source.toLowerCase();
  if (channel === "pharmacy") {
    if (s.includes("1mg")) return "Tata 1mg";
    if (s.includes("apollo")) return "Apollo Pharmacy";
    if (s.includes("netmeds")) return "Netmeds";
    return null;
  }
  if (s.includes("amazon")) return "Amazon.in";
  if (s.includes("flipkart")) return "Flipkart";
  if (s.includes("nykaa")) return "Nykaa";
  return null;
}

/** Multi-packs, combos and kits would make one price look like another product's. */
const BUNDLE = /pack of|combo|bundle|\bkit\b|\bset\b|\d\s?x\s?\d|\bx\s?\d\b|\d\s?x\b|\d\s?(?:ml|gm|g)\s*(?:&|and|\+)\s*\w/;

/**
 * `strict` (used for the savings reference) also drops listings that don't state their pack size,
 * so a per-gram price is never worked out from the wrong size.
 */
async function liveListings(seed: CatalogItem, apiKey: string, strict = false): Promise<MarketListing[]> {
  const params = new URLSearchParams({
    engine: "google_shopping",
    q: seed.query,
    gl: "in",
    hl: "en",
    google_domain: "google.co.in",
    api_key: apiKey,
  });
  const res = await fetch(`https://serpapi.com/search.json?${params}`, {
    signal: AbortSignal.timeout(8000),
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`SerpApi ${res.status}`);
  const data = (await res.json()) as { shopping_results?: SerpResult[] };

  const found = new Map<Merchant, MarketListing>();
  for (const r of data.shopping_results ?? []) {
    const merchant = merchantFromSource(seed.channel, r.source);
    if (!merchant || found.has(merchant) || !r.extracted_price) continue;
    // Skip look-alikes: the title must name the product, and any pack size it states must match.
    const title = (r.title ?? "").toLowerCase();
    if (!seed.match.every((w) => title.includes(w)) || BUNDLE.test(title)) continue;
    const sized = title.match(/(\d+)\s?(?:ml|gm|g)\b/);
    if (sized && sized[1] !== seed.size.replace(/[^0-9]/g, "")) continue;
    if (strict && !sized) continue;
    found.set(merchant, {
      merchant,
      price: r.extracted_price,
      rating: r.rating ?? 0,
      // SerpApi sometimes returns thousands as a decimal (1.4 meaning 1.4K).
      reviews:
        r.reviews && r.reviews < 10 && !Number.isInteger(r.reviews)
          ? Math.round(r.reviews * 1000)
          : (r.reviews ?? 0),
      url: r.product_link ?? r.link ?? searchUrl(merchant, seed.query),
    });
  }
  return MERCHANTS[seed.channel].map((m) => found.get(m)).filter((l): l is MarketListing => !!l);
}

const cheapest = (l: MarketListing[]) => Math.min(...l.map((x) => x.price));
const amount = (size: string) => Number(size.replace(/[^0-9.]/g, "")) || 0;

/** Safe wrapper: one failing search never takes the whole store down. */
async function safeListings(seed: CatalogItem, apiKey: string, strict = false) {
  try {
    return await liveListings(seed, apiKey, strict);
  } catch (err) {
    console.warn("[marketplace] SerpApi failed:", (err as Error).message);
    return [];
  }
}

/**
 * Cheapest clean price for the savings reference: any seller, but the title must state exactly the
 * pack size we assume, and must not be a combo. Returns null when nothing clean is found.
 */
async function referencePrice(seed: CatalogItem, apiKey: string): Promise<number | null> {
  try {
    const params = new URLSearchParams({
      engine: "google_shopping",
      q: seed.query,
      gl: "in",
      hl: "en",
      google_domain: "google.co.in",
      api_key: apiKey,
    });
    const res = await fetch(`https://serpapi.com/search.json?${params}`, {
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { shopping_results?: SerpResult[] };
    const prices: number[] = [];
    for (const r of data.shopping_results ?? []) {
      const title = (r.title ?? "").toLowerCase();
      const sized = title.match(/(\d+)\s?(?:ml|gm|g)\b/);
      if (!r.extracted_price || !seed.match.every((w) => title.includes(w)) || BUNDLE.test(title)) continue;
      if (!sized || sized[1] !== seed.size.replace(/[^0-9]/g, "")) continue;
      prices.push(r.extracted_price);
    }
    return prices.length ? Math.min(...prices) : null;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const channel: Channel = params.get("channel") === "pharmacy" ? "pharmacy" : "commercial";
  // A locked store can still tease two products (with live prices) so people see what unlocks.
  const preview = params.get("preview") === "1";

  let tier: "none" | "soothing" | "full" = "none";
  let recovery = false;
  let seeds: CatalogItem[];
  if (preview) {
    seeds = CATALOG.filter((s) => s.channel === "commercial"); // cached for an hour; first two with prices are shown
  } else {
    // The Shield Score decides what may be sold: the engine, not the client, gates the store.
    const score = Number(params.get("score"));
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
    tier = commerce.tier;
    // Redness above 40 means the skin is still inflamed: even a high score only opens soothing care.
    const redness = Number(params.get("redness"));
    if (Number.isFinite(redness) && params.get("redness") !== null && redness > 40 && tier === "full") {
      tier = "soothing";
      recovery = true;
    }
    seeds = CATALOG.filter((s) => s.channel === channel && (tier === "full" || s.phase === 1));
  }

  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Live prices aren't configured (SERPAPI_API_KEY is missing)." }, { status: 503 });
  }

  // The pharmacy tab also needs popular-brand moisturiser prices, to work out the savings badge.
  const referenceSeeds =
    !preview && channel === "pharmacy" ? CATALOG.filter((s) => s.savingsReference) : [];

  const [results, referenceResults] = await Promise.all([
    Promise.all(seeds.map((s) => safeListings(s, apiKey))),
    Promise.all(referenceSeeds.map((s) => referencePrice(s, apiKey))),
  ]);

  // Reference: median price per 100 g/ml of popular-brand moisturisers (cheapest listing of each).
  const units = referenceSeeds
    .map((s, i) => (referenceResults[i] !== null && amount(s.size) ? ((referenceResults[i] as number) / amount(s.size)) * 100 : null))
    .filter((u): u is number => u !== null)
    .sort((a, b) => a - b);
  const referenceUnit = units.length ? units[Math.floor(units.length / 2)] : null;
  const referenceNames = referenceSeeds.filter((_, i) => referenceResults[i] !== null).map((s) => s.brand);

  let products: MarketProduct[] = [];
  seeds.forEach((seed, i) => {
    let listings = results[i];
    // A price under 40% of the dearest listing is almost always a different (smaller) pack: drop it.
    if (listings.length > 1) {
      const top = Math.max(...listings.map((l) => l.price));
      listings = listings.filter((l) => l.price >= top * 0.4);
    }
    if (listings.length === 0) return;
    const product: MarketProduct = { ...pick(seed), listings };
    if (channel === "pharmacy" && !preview && referenceUnit && amount(seed.size)) {
      // What the same amount would cost in popular brands, minus what this costs.
      const save = Math.round((referenceUnit * amount(seed.size)) / 100 - cheapest(listings));
      if (save >= 50) product.savings = { amount: save, versus: referenceNames.join(", ") };
    }
    products.push(product);
  });
  if (preview) products = products.slice(0, 2);

  if (products.length === 0) {
    return NextResponse.json({ error: "Couldn't load live prices right now. Please try again." }, { status: 502 });
  }

  // While soothing-only, show the richer products as locked cards (no prices fetched for them).
  if (!preview && tier === "soothing") {
    for (const seed of CATALOG) {
      if (seed.channel === channel && seed.phase === 2) products.push({ ...pick(seed), listings: [], locked: true });
    }
  }

  const body: MarketplaceResponse = { source: "serpapi", channel, tier, recovery, products };
  return NextResponse.json(body);
}
