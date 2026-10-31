import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { sql } from "@/lib/db";
import type { StoredScan } from "@/types/dermshield";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SCANS = 200;
const DAY_MS = 86_400_000;
const STAGES = ["compromised", "healing", "restored"] as const;

async function currentUserId(): Promise<string | null> {
  const { data: session } = await auth.getSession();
  return session?.user?.id ?? null;
}

const unauthorized = () => NextResponse.json({ error: "Please sign in." }, { status: 401 });

type Row = {
  id: string;
  day_number: number;
  scanned_at: string;
  redness: number;
  roughness: number;
  hydration: number;
  shield_score: number;
  stage: StoredScan["stage"];
};

const toScan = (r: Row): StoredScan => ({
  id: r.id,
  dayNumber: r.day_number,
  timestamp: new Date(r.scanned_at).getTime(),
  metrics: { redness: r.redness, roughness: r.roughness, hydration: r.hydration, shieldScore: r.shield_score },
  stage: r.stage,
});

const isNum = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);
const pct = (n: number) => Math.min(100, Math.max(0, Math.round(n)));

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return unauthorized();
  const rows = (await sql`
    SELECT id, day_number, scanned_at, redness, roughness, hydration, shield_score, stage
    FROM scan_sessions WHERE user_id = ${userId}
    ORDER BY scanned_at ASC LIMIT ${MAX_SCANS}`) as Row[];
  return NextResponse.json({ scans: rows.map(toScan) });
}

/** Save one scan, or import several (oldest first) with their original timestamps. */
export async function POST(req: Request) {
  const userId = await currentUserId();
  if (!userId) return unauthorized();

  const body = (await req.json().catch(() => null)) as unknown;
  const items = Array.isArray(body) ? body : [body];
  if (items.length === 0 || items.length > 50) {
    return NextResponse.json({ error: "Invalid scan data." }, { status: 400 });
  }

  const saved: StoredScan[] = [];
  for (const raw of items) {
    const b = raw as Partial<StoredScan> | null;
    const m = b?.metrics;
    if (
      !m ||
      !isNum(m.redness) ||
      !isNum(m.roughness) ||
      !isNum(m.hydration) ||
      !isNum(m.shieldScore) ||
      !b?.stage ||
      !STAGES.includes(b.stage)
    ) {
      return NextResponse.json({ error: "Invalid scan data." }, { status: 400 });
    }
    const when = isNum(b.timestamp) && b.timestamp < Date.now() + 60_000 ? b.timestamp : Date.now();

    // Real day number: whole days since this person's first scan (first scan = Day 1).
    const first = (await sql`
      SELECT MIN(scanned_at) AS first FROM scan_sessions WHERE user_id = ${userId}`) as { first: string | null }[];
    const firstMs = first[0]?.first ? Math.min(new Date(first[0].first).getTime(), when) : when;
    const day = Math.max(1, Math.floor((when - firstMs) / DAY_MS) + 1);

    const rows = (await sql`
      INSERT INTO scan_sessions (user_id, day_number, scanned_at, redness, roughness, hydration, shield_score, stage)
      VALUES (${userId}, ${day}, ${new Date(when).toISOString()}, ${pct(m.redness)}, ${pct(m.roughness)},
              ${pct(m.hydration)}, ${pct(m.shieldScore)}, ${b.stage})
      RETURNING id, day_number, scanned_at, redness, roughness, hydration, shield_score, stage`) as Row[];
    saved.push(toScan(rows[0]));
  }
  return NextResponse.json({ scans: saved });
}

export async function DELETE() {
  const userId = await currentUserId();
  if (!userId) return unauthorized();
  await sql`DELETE FROM scan_sessions WHERE user_id = ${userId}`;
  return NextResponse.json({ ok: true });
}
