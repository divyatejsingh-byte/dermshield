export type Stage = "acute" | "rehab" | "restored";

/** All metrics are 0-100. Redness & roughness: higher = worse. Hydration: higher = better. */
export interface SkinMetrics {
  redness: number;
  roughness: number;
  hydration: number;
}

export type ActiveCategory =
  | "exfoliant"
  | "retinoid"
  | "vitaminC"
  | "gentle"
  | "other";

export interface ShelfProduct {
  id: string;
  name: string;
  /** Human-readable active ingredient tag */
  active: string;
  category: ActiveCategory;
  /** Whether the product is currently part of the user's routine */
  enabled: boolean;
  custom?: boolean;
}

export type QuarantineStatus = "quarantined" | "safe";

export interface ShelfVerdict {
  product: ShelfProduct;
  status: QuarantineStatus;
  reason: string;
}

export interface ShelfEvaluation {
  verdicts: ShelfVerdict[];
  harshCount: number;
  /** Harsh products in use while redness > 50 */
  conflict: boolean;
  /** Two or more harsh actives layered together */
  stacking: boolean;
  /** Points deducted from the score because of active load */
  penalty: number;
  /** Points added for gentle, calming products */
  bonus: number;
  /** Whether any product is currently paused */
  quarantineActive: boolean;
}

export interface ShieldResult {
  score: number;
  baseScore: number;
  stage: Stage;
  evaluation: ShelfEvaluation;
}

export interface CommerceState {
  unlocked: boolean;
  /** none = locked, soothing = Phase 1 calming products only, full = all gentle care */
  tier: "none" | "soothing" | "full";
}

export type Merchant = "Amazon.in" | "Flipkart" | "Nykaa";

export interface MarketListing {
  merchant: Merchant;
  /** Price in INR */
  price: number;
  url: string;
  rating: number;
  reviews: number;
}

export interface MarketProduct {
  id: string;
  title: string;
  brand: string;
  size: string;
  benefit: string;
  /** 1 = soothing (available while healing), 2 = restorative (after full recovery) */
  phase: 1 | 2;
  tags: string[];
  /** Data-URI or remote image URL */
  thumbnail: string;
  listings: MarketListing[];
}

export interface MarketplaceResponse {
  source: "serpapi";
  tier: "soothing" | "full";
  products: MarketProduct[];
}

export interface SkinAnalysis {
  metrics: SkinMetrics;
  source: "youcam-live";
  latencyMs: number;
  capturedAt: string;
}

export interface StoredScan {
  id: string;
  dayNumber: number;
  timestamp: number;
  metrics: {
    redness: number;
    roughness: number;
    hydration: number;
    shieldScore: number;
  };
  stage: "compromised" | "healing" | "restored";
}
