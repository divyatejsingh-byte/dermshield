import type {
  ActiveCategory,
  CommerceState,
  ShelfEvaluation,
  ShelfProduct,
  ShelfVerdict,
  ShieldResult,
  SkinMetrics,
  Stage,
} from "@/types/dermshield";

/* ------------------------------------------------------------------ */
/* Baselines & recovery curve                                          */
/* ------------------------------------------------------------------ */

/** Fully restored target every baseline heals toward. */
export const RESTORED_TARGET: SkinMetrics = {
  redness: 14,
  roughness: 18,
  hydration: 84,
};

export const TIMELINE_DAYS = [1, 3, 4, 5, 7] as const;
export const QUARANTINE_LENGTH_DAYS = 5;

/** Healing progress (0 = baseline, 1 = restored) keyed by day. */
const PROGRESS_KEYFRAMES: Array<[number, number]> = [
  [1, 0],
  [3, 0.32],
  [4, 0.71],
  [5, 0.79],
  [7, 1],
];

export function progressForDay(day: number): number {
  const d = Math.min(7, Math.max(1, day));
  for (let i = 1; i < PROGRESS_KEYFRAMES.length; i++) {
    const [d0, p0] = PROGRESS_KEYFRAMES[i - 1];
    const [d1, p1] = PROGRESS_KEYFRAMES[i];
    if (d <= d1) return p0 + ((p1 - p0) * (d - d0)) / (d1 - d0);
  }
  return 1;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Project a day-1 baseline forward to the given day of the recovery plan. */
export function projectMetrics(baseline: SkinMetrics, day: number): SkinMetrics {
  const p = progressForDay(day);
  // A mild baseline should never "heal" to something worse than itself.
  const target: SkinMetrics = {
    redness: Math.min(baseline.redness, RESTORED_TARGET.redness),
    roughness: Math.min(baseline.roughness, RESTORED_TARGET.roughness),
    hydration: Math.max(baseline.hydration, RESTORED_TARGET.hydration),
  };
  return {
    redness: lerp(baseline.redness, target.redness, p),
    roughness: lerp(baseline.roughness, target.roughness, p),
    hydration: lerp(baseline.hydration, target.hydration, p),
  };
}

/* ------------------------------------------------------------------ */
/* Ingredient rules                                                    */
/* ------------------------------------------------------------------ */

export const HARSH_CATEGORIES: ReadonlySet<ActiveCategory> = new Set([
  "exfoliant",
  "retinoid",
  "vitaminC",
]);

const CATEGORY_PATTERNS: Array<[ActiveCategory, RegExp]> = [
  ["retinoid", /retin|adapalene|tretinoin|bakuchiol/i],
  [
    "exfoliant",
    /salicylic|bha|aha|glycolic|lactic|mandelic|azelaic|pha|gluconolactone|benzoyl|acid|exfoliant/i,
  ],
  ["vitaminC", /vitamin\s*c|ascorbic|ascorbyl|l-ascorbic/i],
  [
    "gentle",
    /ceramide|panthenol|madecassoside|hyaluron|squalane|centella|cica|niacinamide|glycerin|petrolatum|shea|allantoin/i,
  ],
];

/** Infer an ingredient category from a free-text active tag. */
export function inferCategory(active: string): ActiveCategory {
  for (const [cat, re] of CATEGORY_PATTERNS) {
    if (re.test(active)) return cat;
  }
  return "other";
}

/**
 * Classify a product from its full ingredient list (INCI text, as printed on the pack).
 * Strong actives win over soothing ones: a retinol cream with ceramides is still a retinoid.
 */
export function inferCategoryFromIngredients(ingredients: string): {
  category: ActiveCategory;
  active: string;
} {
  const t = ingredients.toLowerCase();
  const rules: Array<[ActiveCategory, RegExp]> = [
    ["retinoid", /retinol|retinal\b|retinyl|adapalene|tretinoin|retinoate/],
    [
      "exfoliant",
      /salicylic|glycolic|lactic acid|mandelic|azelaic|gluconolactone|lactobionic|benzoyl peroxide|\bbha\b|\baha\b/,
    ],
    ["vitaminC", /ascorbic|ascorbyl|tetrahexyldecyl ascorbate/],
    [
      "gentle",
      /ceramide|panthenol|madecassoside|centella|hyaluron|squalane|niacinamide|allantoin|petrolatum|shea butter|glycerin/,
    ],
  ];
  for (const [category, re] of rules) {
    const hit = re.exec(t);
    if (hit) {
      const raw = hit[0].trim();
      const word = raw === "bha" ? "BHA" : raw === "aha" ? "AHA" : raw;
      return { category, active: word.charAt(0).toUpperCase() + word.slice(1) };
    }
  }
  return { category: "other", active: "No strong actives found" };
}

export const CATEGORY_LABEL: Record<ActiveCategory, string> = {
  exfoliant: "Exfoliating acid",
  retinoid: "Retinoid",
  vitaminC: "Vitamin C",
  gentle: "Skin-calming",
  other: "Neutral",
};

/* ------------------------------------------------------------------ */
/* Shelf audit                                                         */
/* ------------------------------------------------------------------ */

/**
 * A harsh active is quarantined while the skin is still inflamed
 * (redness > 30) or the 5-day pause has not yet elapsed.
 */
export function isQuarantineWindow(metrics: SkinMetrics, day: number): boolean {
  return metrics.redness > 30 || day < QUARANTINE_LENGTH_DAYS;
}

export function evaluateShelf(
  shelf: ShelfProduct[],
  metrics: SkinMetrics,
  day: number,
): ShelfEvaluation {
  const inWindow = isQuarantineWindow(metrics, day);
  const active = shelf.filter((p) => p.enabled);
  const harshCount = active.filter((p) => HARSH_CATEGORIES.has(p.category)).length;
  const gentleCount = active.filter((p) => p.category === "gentle").length;

  const verdicts: ShelfVerdict[] = shelf.map((product) => {
    const harsh = HARSH_CATEGORIES.has(product.category);
    if (harsh && product.enabled && inWindow) {
      return {
        product,
        status: "quarantined",
        reason:
          metrics.redness > 50
            ? "Too harsh while your skin is raw."
            : day < QUARANTINE_LENGTH_DAYS
              ? `Paused until Day ${QUARANTINE_LENGTH_DAYS} so your skin can rest.`
              : "Redness is still too high to restart this product.",
      };
    }
    if (harsh && !product.enabled) {
      return { product, status: "safe", reason: "Not in routine." };
    }
    if (harsh) {
      return {
        product,
        status: "safe",
        reason: "Skin has healed - restart one strong product at a time, 2-3 times a week.",
      };
    }
    return {
      product,
      status: "safe",
      reason:
        product.category === "gentle"
          ? "Calms irritation and protects moisture."
          : "No harsh ingredients found.",
    };
  });

  const stacking = harshCount >= 2;
  const conflict = harshCount >= 1 && metrics.redness > 50;

  // Active-load penalty scales with how inflamed the skin currently is.
  const severity = 0.4 + metrics.redness / 100;
  const rawPenalty = harshCount * 3 + (stacking ? 5 : 0);
  const penalty = round1(rawPenalty * severity);
  const bonus = Math.min(4, gentleCount * 2);

  const quarantineActive = verdicts.some((v) => v.status === "quarantined");

  return { verdicts, harshCount, conflict, stacking, penalty, bonus, quarantineActive };
}

/* ------------------------------------------------------------------ */
/* Scoring & stage state machine                                       */
/* ------------------------------------------------------------------ */

const clamp = (n: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, n));
const round1 = (n: number) => Math.round(n * 10) / 10;

/** Weighted skin-health score from raw metrics (0-100). */
export function baseScore(m: SkinMetrics): number {
  return clamp(0.45 * (100 - m.redness) + 0.25 * (100 - m.roughness) + 0.3 * m.hydration);
}

export function stageForScore(score: number): Stage {
  if (score >= 75) return "restored";
  if (score >= 50) return "rehab";
  return "acute";
}

/** Skin Shield Score: weighted metrics, minus active-stacking penalty, plus gentle-product bonus. */
export function computeShield(
  shelf: ShelfProduct[],
  metrics: SkinMetrics,
  day: number,
): ShieldResult {
  const evaluation = evaluateShelf(shelf, metrics, day);
  const base = baseScore(metrics);
  const score = clamp(base - evaluation.penalty + evaluation.bonus);
  return { score, baseScore: base, stage: stageForScore(score), evaluation };
}

export interface StageMeta {
  label: string;
  short: string;
  tone: "rose" | "amber" | "emerald";
}

export const STAGE_META: Record<Stage, StageMeta> = {
  acute: { label: "Compromised / Raw", short: "Compromised", tone: "rose" },
  rehab: { label: "Healing Phase", short: "Healing", tone: "amber" },
  restored: { label: "Fully Restored", short: "Restored", tone: "emerald" },
};

/** The Safe Store unlocks once the Skin Shield Score reaches 50 (i.e. leaves the raw stage). */
export function commerceState(stage: Stage): CommerceState {
  return {
    unlocked: stage !== "acute",
    tier: stage === "acute" ? "none" : stage === "rehab" ? "soothing" : "full",
  };
}

export function dayLabel(day: number): string {
  if (day <= 1) return "Inflamed";
  if (day <= 3) return "Calming";
  if (day <= 5) return "Healing";
  return "Restored";
}

/* ------------------------------------------------------------------ */
/* Landing / ledger helpers                                            */
/* ------------------------------------------------------------------ */

const FLUSH_BASE: Record<ActiveCategory, number> = {
  exfoliant: 34,
  retinoid: 41,
  vitaminC: 22,
  gentle: -8,
  other: 0,
};

/** Signed % irritation-risk contribution of a product at the current redness. */
export function flushRisk(product: ShelfProduct, metrics: SkinMetrics): number {
  const base = FLUSH_BASE[product.category];
  if (base <= 0) return base;
  return Math.round(base * ((0.4 + metrics.redness / 100) / 1.22));
}

export type LedgerStatus = "within" | "elevated" | "critical";

export interface LedgerRow {
  key: keyof SkinMetrics;
  label: string;
  value: number;
  tolerance: string;
  status: LedgerStatus;
}

export function ledgerRows(m: SkinMetrics): LedgerRow[] {
  const hi = (v: number, ok: number, warn: number): LedgerStatus =>
    v < ok ? "within" : v < warn ? "elevated" : "critical";
  return [
    { key: "redness", label: "Redness & Irritation", value: m.redness, tolerance: "< 30 / 100", status: hi(m.redness, 30, 55) },
    { key: "roughness", label: "Skin Texture & Flaking", value: m.roughness, tolerance: "< 35 / 100", status: hi(m.roughness, 35, 60) },
    {
      key: "hydration",
      label: "Moisture Level",
      value: m.hydration,
      tolerance: "> 60 / 100",
      status: m.hydration > 60 ? "within" : m.hydration > 40 ? "elevated" : "critical",
    },
  ];
}
