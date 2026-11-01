import { inferCategoryFromIngredients } from "@/lib/shieldEngine";
import type { ActiveCategory } from "@/types/dermshield";

/** What /api/analyze-bottle returns for one label. */
export interface BottleResult {
  productName: string;
  primaryActives: string[];
  category: "cleanser" | "active" | "moisturizer" | "sunscreen";
  status: "safe" | "paused";
  cooldownDays: number;
  reason: string;
  /** How the audit engine should classify it */
  shelfCategory: ActiveCategory;
}

/** Shrink a photo to a JPEG under ~1280px so phone shots upload quickly. Returns raw base64. */
export async function toJpegBase64(source: Blob, maxSide = 1280, quality = 0.82): Promise<string> {
  const bitmap = await createImageBitmap(source);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Couldn't prepare the photo.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  return dataUrl.slice(dataUrl.indexOf(",") + 1);
}

/** Draws an ingredient label (a strong exfoliating acid) so the live pipeline can always be demonstrated. */
export async function renderSampleLabel(): Promise<string> {
  const c = document.createElement("canvas");
  c.width = 900;
  c.height = 1100;
  const g = c.getContext("2d");
  if (!g) throw new Error("Couldn't prepare the sample.");
  g.fillStyle = "#f6f2ea";
  g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = "#222";
  g.lineWidth = 4;
  g.strokeRect(30, 30, 840, 1040);
  g.fillStyle = "#111";
  g.font = "bold 64px Arial, sans-serif";
  g.fillText("Clearly Pure", 70, 140);
  g.font = "bold 44px Arial, sans-serif";
  g.fillText("Salicylic Acid 2% Solution", 70, 210);
  g.fillStyle = "#444";
  g.font = "34px Arial, sans-serif";
  g.fillText("Exfoliating blemish treatment", 70, 262);
  g.fillStyle = "#222";
  g.fillRect(70, 298, 760, 3);
  g.fillStyle = "#111";
  g.font = "bold 34px Arial, sans-serif";
  g.fillText("INGREDIENTS", 70, 365);
  g.fillStyle = "#222";
  g.font = "30px Arial, sans-serif";
  const lines = [
    "Aqua, Salicylic Acid, Propanediol, Glycerin,",
    "Alcohol Denat., Panthenol, Sodium Hydroxide,",
    "Parfum, Phenoxyethanol",
  ];
  lines.forEach((l, i) => g.fillText(l, 70, 420 + i * 44));
  g.fillStyle = "#555";
  g.font = "28px Arial, sans-serif";
  g.fillText("30 ml / 1 fl oz", 70, 1010);
  const url = c.toDataURL("image/jpeg", 0.88);
  return url.slice(url.indexOf(",") + 1);
}

/** Used only for the sample label when live reading is unavailable, so the demo never dead-ends. */
export function offlineSampleResult(redness: number | null): BottleResult {
  const paused = redness === null || redness > 35;
  const { category } = inferCategoryFromIngredients("Salicylic Acid");
  return {
    productName: "Clearly Pure Salicylic Acid 2% Solution",
    primaryActives: ["Salicylic Acid 2%"],
    category: "active",
    status: paused ? "paused" : "safe",
    cooldownDays: paused ? 5 : 0,
    reason: paused
      ? "This direct acid is too strong while your skin is red or raw. Pausing it lets your skin's natural shield recover."
      : "Your redness is low enough to tolerate this exfoliating acid, used gently.",
    shelfCategory: category,
  };
}

export async function analyzeBottle(
  imageBase64: string,
  skinRedness: number | null,
  currentAuditedProducts: Array<{ name: string }>,
): Promise<{ ok: true; result: BottleResult } | { ok: false; error: string; status: number }> {
  try {
    const res = await fetch("/api/analyze-bottle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64, skinRedness, currentAuditedProducts }),
    });
    const body = (await res.json().catch(() => ({}))) as Partial<BottleResult> & { error?: string };
    if (!res.ok) return { ok: false, error: body.error ?? "Couldn't read that label.", status: res.status };
    return { ok: true, result: body as BottleResult };
  } catch {
    return { ok: false, error: "No connection. Check your internet and try again.", status: 0 };
  }
}
