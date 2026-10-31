import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { sql } from "@/lib/db";
import type { ActiveCategory, ShelfProduct } from "@/types/dermshield";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CATEGORIES: ActiveCategory[] = ["exfoliant", "retinoid", "vitaminC", "gentle", "other"];
const MAX_PRODUCTS = 60;

async function currentUserId(): Promise<string | null> {
  const { data: session } = await auth.getSession();
  return session?.user?.id ?? null;
}

const unauthorized = () => NextResponse.json({ error: "Please sign in." }, { status: 401 });

/** The signed-in user's saved product list. */
export async function GET() {
  const userId = await currentUserId();
  if (!userId) return unauthorized();
  const rows = (await sql`SELECT shelf FROM user_shelves WHERE user_id = ${userId}`) as { shelf: ShelfProduct[] }[];
  return NextResponse.json({ shelf: rows[0]?.shelf ?? [] });
}

/** Replace the saved list. Each item is validated; nothing else is stored. */
export async function PUT(req: Request) {
  const userId = await currentUserId();
  if (!userId) return unauthorized();

  const body = (await req.json().catch(() => null)) as { shelf?: unknown } | null;
  if (!body || !Array.isArray(body.shelf) || body.shelf.length > MAX_PRODUCTS) {
    return NextResponse.json({ error: "Invalid product list." }, { status: 400 });
  }

  const clean: ShelfProduct[] = [];
  for (const raw of body.shelf) {
    const p = raw as Partial<ShelfProduct> | null;
    if (
      !p ||
      typeof p.id !== "string" ||
      typeof p.name !== "string" ||
      typeof p.active !== "string" ||
      typeof p.enabled !== "boolean" ||
      !p.category ||
      !CATEGORIES.includes(p.category)
    ) {
      return NextResponse.json({ error: "Invalid product list." }, { status: 400 });
    }
    clean.push({
      id: p.id.slice(0, 80),
      name: p.name.slice(0, 160),
      active: p.active.slice(0, 160),
      category: p.category,
      enabled: p.enabled,
      custom: true,
    });
  }

  await sql`
    INSERT INTO user_shelves (user_id, shelf, updated_at)
    VALUES (${userId}, ${JSON.stringify(clean)}::jsonb, now())
    ON CONFLICT (user_id) DO UPDATE SET shelf = EXCLUDED.shelf, updated_at = now()`;
  return NextResponse.json({ ok: true });
}
