import type { ActiveCategory } from "@/types/dermshield";

export interface QuickProduct {
  label: string;
  name: string;
  active: string;
  category: ActiveCategory;
}

/** One-tap additions for the product audit (common strong actives, plus two gentle ones). */
export const QUICK_PRODUCTS: QuickProduct[] = [
  { label: "The Ordinary Peeling Solution", name: "The Ordinary AHA 30% + BHA 2% Peeling Solution", active: "Glycolic acid + salicylic acid", category: "exfoliant" },
  { label: "Retinol 0.5%", name: "Retinol 0.5% Serum", active: "Retinol", category: "retinoid" },
  { label: "Glycolic Acid Toner", name: "Glycolic Acid Toner", active: "Glycolic acid", category: "exfoliant" },
  { label: "2% Salicylic Acid Cleanser", name: "2% Salicylic Acid Cleanser", active: "Salicylic acid", category: "exfoliant" },
  { label: "Vitamin C 20% Serum", name: "Vitamin C 20% Serum", active: "L-Ascorbic acid", category: "vitaminC" },
  { label: "Hyaluronic Acid Serum", name: "Hyaluronic Acid Serum", active: "Hyaluronic acid", category: "gentle" },
  { label: "Ceramide Moisturiser", name: "Ceramide Moisturiser", active: "Ceramides", category: "gentle" },
];
