/**
 * Safe Store catalog: WHICH products we suggest, per channel. Prices, ratings and links are never
 * stored here; they are fetched live (SerpApi) for each product when the store loads.
 * Active-ingredient tags come from the products' own retailer listings, not guesses.
 */

export type Channel = "pharmacy" | "commercial";

export interface CatalogItem {
  id: string;
  channel: Channel;
  /** Search sent to Google Shopping (India) */
  query: string;
  /** Every one of these lower-case words must appear in a listing title for it to count */
  match: string[];
  title: string;
  brand: string;
  /** Pack size we compare on, e.g. "100 g". Listings that state a different size are skipped. */
  size: string;
  benefit: string;
  /** Short ingredient line shown on the card */
  activeTag?: string;
  /** 1 = soothing (open from score 50), 2 = richer moisturisers (from 75) */
  phase: 1 | 2;
  tags: string[];
  /** Pack-shape art colour (no external images) */
  art: { hue: number; shape: "tube" | "jar" | "bottle" };
  /** Commercial moisturisers used as the reference for the pharmacy "savings" badge */
  savingsReference?: boolean;
}

export const CATALOG: CatalogItem[] = [
  /* ---------------- Pharmacy essentials (generic / pharma-brand) ---------------- */
  {
    id: "rx-oryza",
    channel: "pharmacy",
    query: "Oryza Skin Repair Restore Moisturizing Lotion 100 ml Alembic",
    match: ["oryza"],
    title: "Oryza Ceramide Moisturising Lotion",
    brand: "Alembic",
    size: "100 ml",
    benefit: "A light ceramide lotion that helps dry, tight skin hold on to water.",
    activeTag: "Ceramides",
    phase: 1,
    tags: ["Lotion", "Fragrance-light", "Dry skin"],
    art: { hue: 190, shape: "bottle" },
  },
  {
    id: "rx-biosilk",
    channel: "pharmacy",
    query: "Biosilk Moisturizing Cream 100 gm oatmeal ceramides",
    match: ["biosilk"],
    title: "Biosilk Moisturising Cream",
    brand: "Biosilk",
    size: "100 g",
    benefit: "Oatmeal and ceramides to soothe flaky, sensitive skin.",
    activeTag: "Oatmeal + ceramides",
    phase: 2,
    tags: ["Cream", "Dry skin"],
    art: { hue: 35, shape: "tube" },
  },
  {
    id: "rx-emolene",
    channel: "pharmacy",
    query: "Emolene Cream 100 gm",
    match: ["emolene"],
    title: "Emolene Moisturising Cream",
    brand: "Emolene",
    size: "100 g",
    benefit: "A simple, no-frills moisturiser for very dry skin.",
    activeTag: "Propylene glycol (hydrating base)",
    phase: 1,
    tags: ["Cream", "Simple formula"],
    art: { hue: 215, shape: "jar" },
  },
  {
    id: "rx-aquasoft",
    channel: "pharmacy",
    query: "Aquasoft FC Advanced Facial Cream 60 gm",
    match: ["aquasoft"],
    title: "Aquasoft FC Advanced Facial Cream",
    brand: "Aquasoft",
    size: "60 g",
    benefit: "A daily face moisturiser with vitamin E and sun protection.",
    activeTag: "Vitamin E + sun protection",
    phase: 2,
    tags: ["Face cream", "Daytime"],
    art: { hue: 150, shape: "tube" },
  },

  /* ---------------- Commercial brands ---------------- */
  {
    id: "lrp-cicaplast",
    channel: "commercial",
    query: "La Roche-Posay Cicaplast Baume B5+ 40ml",
    match: ["cicaplast"],
    title: "La Roche-Posay Cicaplast Baume B5+ Soothing Repair Balm",
    brand: "La Roche-Posay",
    size: "40 ml",
    benefit: "Panthenol + madecassoside calm redness and help your skin heal faster.",
    activeTag: "Panthenol + madecassoside",
    phase: 1,
    tags: ["Fragrance-free", "Post-irritation"],
    art: { hue: 165, shape: "tube" },
  },
  {
    id: "avene-cicalfate",
    channel: "commercial",
    query: "Avene Cicalfate+ Restorative Protective Cream 40ml",
    match: ["cicalfate"],
    title: "Avène Cicalfate+ Restorative Protective Cream",
    brand: "Avène",
    size: "40 ml",
    benefit: "Thermal-water based care for irritated, over-treated skin.",
    activeTag: "Sucralfate + thermal water",
    phase: 1,
    tags: ["Post-treatment"],
    art: { hue: 28, shape: "tube" },
  },
  {
    id: "cerave-moisturising",
    channel: "commercial",
    query: "CeraVe Moisturising Cream 340g",
    match: ["cerave", "moisturi"],
    title: "CeraVe Moisturising Cream with Ceramides & Hyaluronic Acid",
    brand: "CeraVe",
    size: "340 g",
    benefit: "3 essential ceramides help restore your natural shield and lock in water.",
    activeTag: "Ceramides + hyaluronic acid",
    phase: 2,
    tags: ["Non-comedogenic"],
    art: { hue: 200, shape: "jar" },
    savingsReference: true,
  },
  {
    id: "cetaphil-moisturising",
    channel: "commercial",
    query: "Cetaphil Moisturising Cream 80g",
    match: ["cetaphil", "moisturi"],
    title: "Cetaphil Moisturising Cream for Dry, Sensitive Skin",
    brand: "Cetaphil",
    size: "80 g",
    benefit: "A rich everyday cream for dry to very dry, sensitive skin.",
    activeTag: "Glycerin-based moisturiser",
    phase: 2,
    tags: ["Fragrance-free", "Dry skin"],
    art: { hue: 215, shape: "jar" },
    savingsReference: true,
  },
  {
    id: "minimalist-ceramide",
    channel: "commercial",
    query: "Minimalist 0.3% Ceramides Moisturizer 50g",
    match: ["minimalist", "ceramide"],
    title: "Minimalist 0.3% Ceramide Moisturizer",
    brand: "Minimalist",
    size: "50 g",
    benefit: "A light ceramide cream for dry or damaged skin.",
    activeTag: "0.3% ceramides",
    phase: 2,
    tags: ["Light texture"],
    art: { hue: 320, shape: "jar" },
    savingsReference: true,
  },
  {
    id: "bioderma-atoderm",
    channel: "commercial",
    query: "Bioderma Atoderm Intensive Baume 500ml",
    match: ["atoderm"],
    title: "Bioderma Atoderm Intensive Baume Ultra-Soothing Balm",
    brand: "Bioderma",
    size: "500 ml",
    benefit: "Rich, soothing balm for dry, sensitive skin.",
    activeTag: "Emollient balm",
    phase: 2,
    tags: ["Fragrance-free", "Dry skin"],
    art: { hue: 275, shape: "bottle" },
  },
];
