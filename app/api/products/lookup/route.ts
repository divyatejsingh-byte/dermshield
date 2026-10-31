import { NextResponse } from "next/server";
import { inferCategoryFromIngredients } from "@/lib/shieldEngine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OBF = "https://world.openbeautyfacts.org";
const FIELDS = "code,product_name,brands,ingredients_text";

interface ObfProduct {
  code?: string;
  product_name?: string;
  brands?: string;
  ingredients_text?: string;
}

function shape(p: ObfProduct) {
  const name = [p.brands?.split(",")[0]?.trim(), p.product_name?.trim()].filter(Boolean).join(" ");
  if (!name) return null;
  const ingredients = (p.ingredients_text ?? "").trim();
  const { category, active } = ingredients
    ? inferCategoryFromIngredients(ingredients)
    : { category: "other" as const, active: "Ingredients not listed" };
  return { barcode: p.code ?? "", name, ingredients, category, active, hasIngredients: !!ingredients };
}

/** Look a product up by barcode or by name in Open Beauty Facts (free, community database). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const barcode = (url.searchParams.get("barcode") ?? "").replace(/\D/g, "");
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 80);

  try {
    if (barcode) {
      if (barcode.length < 8 || barcode.length > 14) {
        return NextResponse.json({ error: "That doesn't look like a valid barcode." }, { status: 400 });
      }
      const res = await fetch(`${OBF}/api/v2/product/${barcode}.json?fields=${FIELDS}`, {
        signal: AbortSignal.timeout(8000),
        headers: { "User-Agent": "DermShield/1.0 (skin routine checker)" },
      });
      const body = (await res.json().catch(() => ({}))) as { status?: number; product?: ObfProduct };
      const p = body.status === 1 && body.product ? shape({ ...body.product, code: barcode }) : null;
      return NextResponse.json({ products: p ? [p] : [] });
    }

    if (q.length >= 3) {
      const params = new URLSearchParams({
        search_terms: q,
        search_simple: "1",
        action: "process",
        json: "1",
        page_size: "8",
        fields: FIELDS,
      });
      const res = await fetch(`${OBF}/cgi/search.pl?${params}`, {
        signal: AbortSignal.timeout(8000),
        headers: { "User-Agent": "DermShield/1.0 (skin routine checker)" },
      });
      const body = (await res.json().catch(() => ({}))) as { products?: ObfProduct[] };
      const products = (body.products ?? []).map(shape).filter((p): p is NonNullable<typeof p> => p !== null);
      return NextResponse.json({ products: products.slice(0, 6) });
    }

    return NextResponse.json({ error: "Enter a barcode or at least 3 letters of the product name." }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Couldn't reach the product database. Try again." }, { status: 502 });
  }
}
