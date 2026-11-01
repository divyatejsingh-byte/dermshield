"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  HARSH_CATEGORIES,
  QUARANTINE_LENGTH_DAYS,
  TIMELINE_DAYS,
  commerceState,
  computeShield,
  inferCategory,
  projectMetrics,
  stageForScore,
} from "@/lib/shieldEngine";
import { clearScans, loadScans, saveScans, stageToStored } from "@/lib/scanStore";
import { authClient } from "@/lib/auth/client";
import { DEMO_METRICS, DEMO_SHELF } from "@/lib/demoProfile";
import type {
  ActiveCategory,
  CommerceState,
  ShelfProduct,
  ShieldResult,
  SkinAnalysis,
  SkinMetrics,
  Stage,
  StoredScan,
} from "@/types/dermshield";

/** Screen-friendly snapshot of the latest reading. Every number is derived, never typed in by hand. */
export interface SkinSnapshot {
  shieldScore: number;
  redness: number;
  texture: number;
  moisture: number;
  isScanned: boolean;
  scanTimestamp?: string;
}

export type AuditCategory = "cleanser" | "active" | "moisturizer" | "sunscreen";

export interface AuditedProduct {
  id: string;
  name: string;
  category: AuditCategory;
  status: "safe" | "paused";
  cooldownDays?: number;
  reason?: string;
}

export interface AuditInput {
  name: string;
  /** Main ingredient, used to classify the product (e.g. "Retinol") */
  active?: string;
  category?: ActiveCategory;
}

/**
 * One shared brain for every page, and the only place scan data lives. It sits in the root layout,
 * which Next.js keeps mounted between routes, and it saves to localStorage so a refresh keeps it too.
 */
export interface SkinState {
  /** False until saved data has been read after mount (prevents server/client mismatch) */
  hydrated: boolean;
  /** Signed in with Google, or in the no-account demo guest mode */
  authed: boolean;
  guest: boolean;
  userId: string | null;
  firstName: string;
  changeGuest: (on: boolean) => void;

  metrics: SkinSnapshot;
  /** Raw readings for components that draw bars and heatmaps (null until scanned) */
  readings: SkinMetrics | null;
  baseline: SkinMetrics | null;
  shield: ShieldResult | null;
  commerce: CommerceState;
  /** Score the store follows: the live scan, else the latest saved session */
  suggestScore: number | null;
  /** True when redness is above 40: only soothing essentials open, richer products stay locked */
  recoveryMode: boolean;

  day: number;
  changeDay: (d: number) => void;
  unlockedDay: number;
  advanceDay: () => void;

  shelf: ShelfProduct[];
  auditedProducts: AuditedProduct[];
  toggleProduct: (id: string) => void;
  addProductToAudit: (product: AuditInput) => void;
  removeProductFromAudit: (id: string) => void;

  photoUrl: string | null;
  heatmap: boolean;
  toggleHeatmap: () => void;
  analyzing: boolean;
  error: string | null;
  uploadPhoto: (file: File) => void;

  demoProfile: boolean;
  startBlankDemo: () => void;
  /** Fills the whole app with the sample over-exfoliation case (no photo needed) */
  loadDemoProfile: () => void;
  /** Merge new readings into the current scan. The Shield Score is always recalculated, not set. */
  updateMetrics: (m: Partial<Omit<SkinSnapshot, "shieldScore" | "isScanned">>) => void;
  resetAllData: () => void;

  scans: StoredScan[];
  scansLoaded: boolean;
  clearHistory: () => void;
}

const Ctx = createContext<SkinState | null>(null);

export function useSkin(): SkinState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSkin must be used inside <SkinProvider>");
  return v;
}

const SKIN_KEY = "dermshield_skin_v1";

interface SavedSkin {
  baseline: SkinMetrics;
  day: number;
  unlockedDay: number;
  demoProfile: boolean;
  scanTimestamp: string | null;
}

export function SkinProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  // The day-1 scan. The healing timeline projects recovery forward from this baseline.
  const [baseline, setBaseline] = useState<SkinMetrics | null>(null);
  const [day, setDay] = useState(1);
  const [shelf, setShelf] = useState<ShelfProduct[]>([]);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [heatmap, setHeatmap] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Sample "over-exfoliated" profile (no photo needed). While on, nothing is saved to the account.
  const [demoProfile, setDemoProfile] = useState(false);
  const [unlockedDay, setUnlockedDay] = useState(7);
  const realShelfRef = useRef<ShelfProduct[]>([]);
  const [scanTimestamp, setScanTimestamp] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const [scans, setScans] = useState<StoredScan[]>([]);
  const [scansLoaded, setScansLoaded] = useState(false);
  // Demo guest: a no-account mode, remembered in this browser.
  const [guest, setGuestState] = useState(false);
  useEffect(() => {
    try {
      setGuestState(window.localStorage.getItem("dermshield_guest") === "1");
    } catch {
      /* storage unavailable */
    }
  }, []);

  // Restore the last scan after mount (never during render, so server and client markup match).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SKIN_KEY);
      const saved = raw ? (JSON.parse(raw) as Partial<SavedSkin>) : null;
      const b = saved?.baseline;
      if (
        b &&
        typeof b.redness === "number" &&
        typeof b.roughness === "number" &&
        typeof b.hydration === "number"
      ) {
        setBaseline({ redness: b.redness, roughness: b.roughness, hydration: b.hydration });
        if (typeof saved?.day === "number") setDay(saved.day);
        if (typeof saved?.unlockedDay === "number") setUnlockedDay(saved.unlockedDay);
        if (typeof saved?.scanTimestamp === "string") setScanTimestamp(saved.scanTimestamp);
        if (saved?.demoProfile) {
          setDemoProfile(true);
          setShelf(DEMO_SHELF);
        }
      }
    } catch {
      /* storage unavailable or corrupt: start clean */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      if (baseline) {
        const saved: SavedSkin = { baseline, day, unlockedDay, demoProfile, scanTimestamp };
        window.localStorage.setItem(SKIN_KEY, JSON.stringify(saved));
      } else {
        window.localStorage.removeItem(SKIN_KEY);
      }
    } catch {
      /* storage full or blocked */
    }
  }, [hydrated, baseline, day, unlockedDay, demoProfile, scanTimestamp]);

  const shelfRef = useRef(shelf);
  shelfRef.current = shelf;

  // Signed in: history is stored per account in the database. Signed out: this browser only.
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const userId = session?.user?.id ?? null;
  const scansRef = useRef(scans);
  scansRef.current = scans;

  useEffect(() => {
    if (sessionPending) return;
    let cancelled = false;
    setScansLoaded(false);

    // One-time purge of scans saved by the old demo mode.
    try {
      if (!window.localStorage.getItem("dermshield_demo_purged")) {
        clearScans();
        window.localStorage.setItem("dermshield_demo_purged", "1");
      }
      window.localStorage.removeItem("dermshield_demo"); // legacy demo flag
    } catch {
      /* storage unavailable */
    }

    (async () => {
      if (!userId) {
        if (!cancelled) {
          setScans(loadScans());
          setScansLoaded(true);
        }
        return;
      }
      try {
        const res = await fetch("/api/scans");
        let list: StoredScan[] = res.ok ? ((await res.json()) as { scans: StoredScan[] }).scans : [];
        // First sign-in on this device: carry the guest history over to the account.
        const local = loadScans();
        if (list.length === 0 && local.length > 0) {
          const up = await fetch("/api/scans", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(local.slice(-50)),
          });
          if (up.ok) {
            list = ((await up.json()) as { scans: StoredScan[] }).scans;
            clearScans();
          }
        }
        if (!cancelled) setScans(list);
      } catch {
        /* offline: keep whatever is on screen */
      } finally {
        if (!cancelled) setScansLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, sessionPending]);

  useEffect(() => {
    if (scansLoaded && !userId) saveScans(scans);
  }, [scans, scansLoaded, userId]);

  const recordScan = useCallback(
    (m: SkinMetrics, score: number, stage: Stage) => {
      const now = Date.now();
      const first = scansRef.current[0]?.timestamp ?? now;
      const rec: StoredScan = {
        id: `${now}-${Math.random().toString(36).slice(2, 7)}`,
        // Real elapsed days since the first scan (first scan = Day 1).
        dayNumber: Math.max(1, Math.floor((now - first) / 86_400_000) + 1),
        timestamp: now,
        metrics: {
          redness: Math.round(m.redness),
          roughness: Math.round(m.roughness),
          hydration: Math.round(m.hydration),
          shieldScore: Math.round(score),
        },
        stage: stageToStored(stage),
      };
      setScans((prev) => [...prev, rec].slice(-200));
      if (userId) {
        fetch("/api/scans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(rec),
        }).catch(() => {});
      }
    },
    [userId],
  );

  // Products you use: saved to your account when signed in, otherwise on this device.
  const [shelfLoaded, setShelfLoaded] = useState(false);
  const demoProfileRef = useRef(false);
  demoProfileRef.current = demoProfile;
  useEffect(() => {
    if (sessionPending) return;
    let cancelled = false;
    setShelfLoaded(false);
    const readLocal = (): ShelfProduct[] => {
      try {
        const raw = window.localStorage.getItem("dermshield_shelf");
        const parsed: unknown = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? (parsed as ShelfProduct[]) : [];
      } catch {
        return [];
      }
    };
    (async () => {
      let list = readLocal();
      if (userId) {
        try {
          const res = await fetch("/api/shelf");
          const server = res.ok ? ((await res.json()) as { shelf: ShelfProduct[] }).shelf : [];
          if (server.length > 0) list = server; // otherwise keep this device's list and save it below
        } catch {
          /* offline: use the device copy */
        }
      }
      if (!cancelled) {
        if (demoProfileRef.current) realShelfRef.current = list;
        else setShelf(list);
        setShelfLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, sessionPending]);

  useEffect(() => {
    if (!shelfLoaded || demoProfile) return;
    try {
      window.localStorage.setItem("dermshield_shelf", JSON.stringify(shelf));
    } catch {
      /* storage unavailable */
    }
    if (!userId) return;
    const t = window.setTimeout(() => {
      fetch("/api/shelf", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shelf }),
      }).catch(() => {});
    }, 600);
    return () => window.clearTimeout(t);
  }, [shelf, shelfLoaded, userId, demoProfile]);

  const leaveDemoProfile = useCallback(() => {
    setDemoProfile((on) => {
      if (on) {
        setShelf(realShelfRef.current);
        setBaseline(null);
        setScanTimestamp(null);
        setDay(1);
        setUnlockedDay(7);
      }
      return false;
    });
  }, []);

  const changeGuest = useCallback(
    (on: boolean) => {
      setGuestState(on);
      try {
        window.localStorage.setItem("dermshield_guest", on ? "1" : "0");
      } catch {
        /* ignore */
      }
      if (!on) leaveDemoProfile();
    },
    [leaveDemoProfile],
  );

  const enterGuest = useCallback(() => {
    setGuestState(true);
    try {
      window.localStorage.setItem("dermshield_guest", "1");
    } catch {
      /* ignore */
    }
  }, []);

  const startSampleDemo = useCallback(() => {
    if (!demoProfile) realShelfRef.current = shelfRef.current;
    setDemoProfile(true);
    setScanTimestamp(new Date().toISOString());
    setBaseline(DEMO_METRICS);
    setShelf(DEMO_SHELF);
    setPhotoUrl(null);
    setError(null);
    setDay(1);
    setUnlockedDay(1);
    if (!userId) {
      enterGuest();
      const r = computeShield(DEMO_SHELF, DEMO_METRICS, 1);
      recordScan(DEMO_METRICS, r.score, r.stage);
    }
    router.push("/scan");
  }, [demoProfile, userId, recordScan, enterGuest, router]);

  // "Try Demo" > blank profile: an empty guest page for trying your own face. Nothing is pre-filled.
  const startBlankDemo = useCallback(() => {
    leaveDemoProfile();
    setBaseline(null);
    setScanTimestamp(null);
    setDay(1);
    setUnlockedDay(7);
    setPhotoUrl(null);
    setError(null);
    if (!userId) enterGuest();
    router.push("/scan");
  }, [leaveDemoProfile, userId, enterGuest, router]);

  const readings = useMemo(() => (baseline ? projectMetrics(baseline, day) : null), [baseline, day]);
  const shield = useMemo(() => (readings ? computeShield(shelf, readings, day) : null), [shelf, readings, day]);
  // Product suggestions follow the current scan, or the latest saved session when there is no live scan.
  const latestScan = scans[scans.length - 1];
  const suggestScore = shield?.score ?? latestScan?.metrics.shieldScore ?? null;
  // Redness above 40 means the skin is still inflamed: even with a good score, only soothing care opens.
  const suggestRedness = readings?.redness ?? latestScan?.metrics.redness ?? null;
  const recoveryMode = suggestRedness !== null && suggestRedness > 40;
  const commerce = useMemo<CommerceState>(() => {
    if (suggestScore === null) return { unlocked: false, tier: "none" };
    const base = commerceState(shield ? shield.stage : stageForScore(suggestScore));
    return recoveryMode && base.tier === "full" ? { unlocked: true, tier: "soothing" } : base;
  }, [shield, suggestScore, recoveryMode]);

  const metrics = useMemo<SkinSnapshot>(
    () => ({
      shieldScore: shield ? Math.round(shield.score) : 0,
      redness: readings ? Math.round(readings.redness) : 0,
      texture: readings ? Math.round(readings.roughness) : 0,
      moisture: readings ? Math.round(readings.hydration) : 0,
      isScanned: readings !== null,
      scanTimestamp: scanTimestamp ?? undefined,
    }),
    [shield, readings, scanTimestamp],
  );

  // Audit view of the shelf: status is calculated from the current skin, never stored.
  const auditedProducts = useMemo<AuditedProduct[]>(() => {
    const verdicts = new Map((shield?.evaluation.verdicts ?? []).map((v) => [v.product.id, v]));
    return shelf.map((p) => {
      const lower = `${p.name} ${p.active}`.toLowerCase();
      const category: AuditCategory = HARSH_CATEGORIES.has(p.category)
        ? "active"
        : /spf|sunscreen|sun protection/.test(lower)
          ? "sunscreen"
          : /cleanser|wash/.test(lower)
            ? "cleanser"
            : "moisturizer";
      const v = verdicts.get(p.id);
      // Before a scan, strong actives are provisionally paused until the skin says otherwise.
      const paused = p.enabled && (v ? v.status === "quarantined" : HARSH_CATEGORIES.has(p.category));
      return {
        id: p.id,
        name: p.name,
        category,
        status: paused ? "paused" : "safe",
        cooldownDays: paused ? Math.max(1, QUARANTINE_LENGTH_DAYS - day + 1) : undefined,
        reason: v?.reason ?? (paused ? "Provisional. Scan your skin to confirm." : undefined),
      };
    });
  }, [shelf, shield, day]);

  useEffect(() => {
    return () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    };
  }, [photoUrl]);

  const uploadPhoto = useCallback(
    async (file: File) => {
      setError(null);
      setAnalyzing(true);
      const url = URL.createObjectURL(file);
      try {
        const form = new FormData();
        form.append("image", file);
        const res = await fetch("/api/analyze", { method: "POST", body: form });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? "Skin analysis failed.");
        }
        const analysis = (await res.json()) as SkinAnalysis;
        if (demoProfileRef.current) {
          setDemoProfile(false);
          setShelf(realShelfRef.current);
        }
        setUnlockedDay(7);
        setPhotoUrl(url);
        setScanTimestamp(new Date().toISOString());
        setBaseline(analysis.metrics);
        setDay(1);
        const r = computeShield(shelfRef.current, analysis.metrics, 1);
        recordScan(analysis.metrics, r.score, r.stage);
      } catch (e) {
        URL.revokeObjectURL(url);
        setError((e as Error).message);
      } finally {
        setAnalyzing(false);
      }
    },
    [recordScan],
  );

  const advanceDay = useCallback(() => {
    const next = TIMELINE_DAYS.find((d) => d > unlockedDay) ?? 7;
    setUnlockedDay(next);
    setDay(next);
  }, [unlockedDay]);

  const toggleProduct = useCallback(
    (id: string) => setShelf((s) => s.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p))),
    [],
  );
  const addProduct = useCallback(
    (name: string, active: string, category?: ActiveCategory) =>
      setShelf((s) => [
        ...s,
        {
          id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name,
          active,
          category: category ?? inferCategory(active),
          enabled: true,
          custom: true,
        },
      ]),
    [],
  );
  const removeProduct = useCallback((id: string) => setShelf((s) => s.filter((p) => p.id !== id)), []);

  const addProductToAudit = useCallback(
    (p: AuditInput) => addProduct(p.name, p.active ?? p.name, p.category),
    [addProduct],
  );

  const updateMetrics = useCallback(
    (m: Partial<Omit<SkinSnapshot, "shieldScore" | "isScanned">>) => {
      const cur: SkinMetrics = baseline ?? { redness: 50, roughness: 50, hydration: 50 };
      const clampPct = (n: number) => Math.min(100, Math.max(0, n));
      setBaseline({
        redness: clampPct(m.redness ?? cur.redness),
        roughness: clampPct(m.texture ?? cur.roughness),
        hydration: clampPct(m.moisture ?? cur.hydration),
      });
      setScanTimestamp(m.scanTimestamp ?? new Date().toISOString());
    },
    [baseline],
  );

  const resetAllData = useCallback(() => {
    setBaseline(null);
    setScanTimestamp(null);
    setDay(1);
    setUnlockedDay(7);
    setDemoProfile(false);
    setShelf([]);
    realShelfRef.current = [];
    setPhotoUrl(null);
    setError(null);
    setScans([]);
    try {
      [SKIN_KEY, "dermshield_shelf", "dermshield_scans"].forEach((k) => window.localStorage.removeItem(k));
    } catch {
      /* ignore */
    }
    if (userId) {
      fetch("/api/scans", { method: "DELETE" }).catch(() => {});
      fetch("/api/shelf", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shelf: [] }),
      }).catch(() => {});
    }
  }, [userId]);

  const clearHistory = useCallback(() => {
    clearScans();
    setScans([]);
    if (userId) fetch("/api/scans", { method: "DELETE" }).catch(() => {});
  }, [userId]);

  const value: SkinState = {
    hydrated,
    authed: !!userId || guest,
    guest: guest && !userId,
    userId,
    firstName: session?.user?.name?.split(" ")[0] ?? "",
    changeGuest,
    metrics,
    readings,
    baseline,
    shield,
    commerce,
    suggestScore,
    recoveryMode,
    day,
    changeDay: setDay,
    unlockedDay,
    advanceDay,
    shelf,
    auditedProducts,
    toggleProduct,
    addProductToAudit,
    removeProductFromAudit: removeProduct,
    photoUrl,
    heatmap,
    toggleHeatmap: () => setHeatmap((h) => !h),
    analyzing,
    error,
    uploadPhoto,
    demoProfile,
    startBlankDemo,
    loadDemoProfile: startSampleDemo,
    updateMetrics,
    resetAllData,
    scans,
    scansLoaded,
    clearHistory,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
