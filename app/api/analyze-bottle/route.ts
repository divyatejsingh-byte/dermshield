import { NextResponse } from "next/server";
import { inferCategoryFromIngredients } from "@/lib/shieldEngine";
import type { ActiveCategory } from "@/types/dermshield";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Gemini Flash family. Override with GEMINI_MODEL when Google retires a version. */
const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

/** Phones send big photos; the client shrinks them, and this keeps us under serverless body limits. */
const MAX_IMAGE_CHARS = 4_000_000;
const REDNESS_LIMIT = 35;

type Category = "cleanser" | "active" | "moisturizer" | "sunscreen";

interface BottleResult {
  productName: string;
  primaryActives: string[];
  category: Category;
  status: "safe" | "paused";
  cooldownDays: number;
  reason: string;
  /** How the audit engine should classify it (drives its own pause rules) */
  shelfCategory: ActiveCategory;
}

/* Best-effort abuse guard (per server instance): label reads cost real API quota. */
const hits = new Map<string, number[]>();
function limited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 15;
}

const SYSTEM_PROMPT = `You are the ingredient analyst inside DermShield, a skin-recovery app. You read skincare product labels from photos.

Rules:
- Use ONLY text that is visible on the label. Never guess ingredients that are not printed. If the photo is too blurry, dark, cropped or is not a skincare label, set readable to false.
- productName: the brand and product name as printed on the label.
- primaryActives: the notable active ingredients, with strengths when printed (e.g. "Salicylic Acid 2%", "Niacinamide"). Up to 5. Leave empty if there are no actives.
- category: "cleanser", "moisturizer", "sunscreen", or "active" (serums, acids, retinoids, exfoliants, treatments).
- status "paused" with cooldownDays 5 (use 7 for very strong or stacked actives): if the user's redness is above ${REDNESS_LIMIT} and the product contains direct acids (AHA, BHA, glycolic, lactic, salicylic, mandelic), retinoids or retinol, pure L-ascorbic acid (vitamin C above 10%), or physical scrubs. If the user has not been scanned yet (redness unknown), treat those same strong actives as paused until they scan.
- status "safe" with cooldownDays 0: gentle soothing products with ceramides, centella, oat, panthenol or hyaluronic acid and no drying alcohol or heavy fragrance. Anything else without strong actives is also "safe".
- reason: one or two plain-English sentences a non-expert understands. Say why it is paused or safe and refer to the redness level when relevant. If it would stack with a strong active the user already uses (listed below), mention that.
- Never use the word "barrier". Say "your skin's natural shield" or "the outer skin layer" instead.
- Reply with JSON only.`;

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    readable: { type: "BOOLEAN" },
    productName: { type: "STRING" },
    primaryActives: { type: "ARRAY", items: { type: "STRING" } },
    category: { type: "STRING", enum: ["cleanser", "active", "moisturizer", "sunscreen"] },
    status: { type: "STRING", enum: ["safe", "paused"] },
    cooldownDays: { type: "INTEGER" },
    reason: { type: "STRING" },
  },
  required: ["readable", "productName", "primaryActives", "category", "status", "cooldownDays", "reason"],
} as const;

interface RawModelResult {
  readable?: boolean;
  productName?: string;
  primaryActives?: string[];
  category?: Category;
  status?: "safe" | "paused";
  cooldownDays?: number;
  reason?: string;
}

const clean = (s: unknown, max: number) => (typeof s === "string" ? s.replace(/\s+/g, " ").trim().slice(0, max) : "");

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("[analyze-bottle] GEMINI_API_KEY is not set: label scanning is disabled.");
    return NextResponse.json({ error: "Label scanning isn't set up on this server yet." }, { status: 503 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (limited(ip)) {
    return NextResponse.json({ error: "That's a lot of scans. Please wait a few minutes and try again." }, { status: 429 });
  }

  const body = (await req.json().catch(() => null)) as {
    imageBase64?: unknown;
    skinRedness?: unknown;
    currentAuditedProducts?: unknown;
  } | null;
  if (!body || typeof body.imageBase64 !== "string" || body.imageBase64.length < 200) {
    return NextResponse.json({ error: "Please add a photo of the label." }, { status: 400 });
  }
  if (body.imageBase64.length > MAX_IMAGE_CHARS) {
    return NextResponse.json({ error: "That photo is too large. Try again with a smaller picture." }, { status: 413 });
  }

  // Accept raw base64 or a data URL.
  const m = body.imageBase64.match(/^data:(image\/(?:jpeg|png|webp));base64,(.*)$/s);
  const mimeType = m ? m[1] : "image/jpeg";
  const data = m ? m[2] : body.imageBase64;

  const redness = typeof body.skinRedness === "number" && Number.isFinite(body.skinRedness) ? body.skinRedness : null;
  const existing = (Array.isArray(body.currentAuditedProducts) ? body.currentAuditedProducts : [])
    .map((p) => clean((p as { name?: unknown })?.name, 80))
    .filter(Boolean)
    .slice(0, 30);

  const userText = [
    `User's current redness: ${redness === null ? "unknown (not scanned yet)" : `${Math.round(redness)}/100`}.`,
    `Products already in the user's routine: ${existing.length ? existing.join("; ") : "none"}.`,
    "Read this label and reply in the required JSON format.",
  ].join("\n");

  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ inlineData: { mimeType, data } }, { text: userText }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
      signal: AbortSignal.timeout(25_000),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "The label reader took too long. Please try again." }, { status: 504 });
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.warn("[analyze-bottle] Gemini error", res.status, detail.slice(0, 300));
    if (res.status === 429) {
      return NextResponse.json({ error: "Label scanning is busy right now. Try again in a minute." }, { status: 429 });
    }
    if (res.status === 400) {
      return NextResponse.json({ error: "We couldn't read that image. Try a clearer, well-lit photo." }, { status: 422 });
    }
    return NextResponse.json({ error: "Label scanning is unavailable right now. Please try again." }, { status: 502 });
  }

  const json = (await res.json().catch(() => null)) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  } | null;
  const text = json?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";

  let raw: RawModelResult;
  try {
    raw = JSON.parse(text) as RawModelResult;
  } catch {
    return NextResponse.json({ error: "We couldn't make sense of that label. Try a clearer photo." }, { status: 422 });
  }

  const productName = clean(raw.productName, 100);
  if (raw.readable === false || !productName) {
    return NextResponse.json(
      { error: "That photo is too blurry or dark to read. Hold steady, fill the frame with the ingredient list, and try again." },
      { status: 422 },
    );
  }

  const primaryActives = (Array.isArray(raw.primaryActives) ? raw.primaryActives : [])
    .map((a) => clean(a, 60))
    .filter(Boolean)
    .slice(0, 5);
  const category: Category = (["cleanser", "active", "moisturizer", "sunscreen"] as const).includes(raw.category as Category)
    ? (raw.category as Category)
    : "moisturizer";

  // Safety net: the model reads the label, but our rules make the final call on clear-cut strong actives.
  const inferred = inferCategoryFromIngredients(`${primaryActives.join(", ")} ${productName}`);
  const strong = inferred.category === "exfoliant" || inferred.category === "retinoid";
  let status: "safe" | "paused" = raw.status === "paused" ? "paused" : "safe";
  let reason = clean(raw.reason, 280);
  if (strong && (redness === null || redness > REDNESS_LIMIT)) status = "paused";
  let cooldownDays = status === "paused" ? Math.min(7, Math.max(5, Math.round(Number(raw.cooldownDays) || 5))) : 0;
  if (!reason) {
    reason =
      status === "paused"
        ? "This has a strong active that can sting skin that is already red or raw."
        : "No strong actives found, so it is unlikely to irritate your skin.";
  }
  if (status === "safe") cooldownDays = 0;

  const shelfCategory: ActiveCategory =
    status === "paused" && !strong && inferred.category !== "vitaminC" ? "exfoliant" : inferred.category;

  const result: BottleResult = { productName, primaryActives, category, status, cooldownDays, reason, shelfCategory };
  return NextResponse.json(result);
}
