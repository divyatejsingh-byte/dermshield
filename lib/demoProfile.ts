import type { ShelfProduct, SkinMetrics } from "@/types/dermshield";

/**
 * "Try Demo Profile": a clearly labelled sample of an over-exfoliated / retinol-burn case,
 * so anyone can see the whole flow without uploading a photo. The Shield Score is NOT set here:
 * it is computed from these readings and the products below by computeShield(), like a real scan.
 */
export const DEMO_PROFILE_LABEL = "Try Demo Profile (Over-exfoliated / Retinol Burn)";

export const DEMO_METRICS: SkinMetrics = { redness: 68, roughness: 54, hydration: 28 };

export const DEMO_SHELF: ShelfProduct[] = [
  {
    id: "demo-peel",
    name: "AHA 30% + BHA 2% Peeling Solution",
    active: "Glycolic acid + salicylic acid",
    category: "exfoliant",
    enabled: true,
    custom: true,
  },
  {
    id: "demo-retinol",
    name: "Retinol 0.5% Serum",
    active: "Retinol",
    category: "retinoid",
    enabled: true,
    custom: true,
  },
  {
    id: "demo-cleanser",
    name: "Ceramide Hydrating Cleanser",
    active: "Ceramides",
    category: "gentle",
    enabled: true,
    custom: true,
  },
];
