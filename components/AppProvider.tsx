"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { TIMELINE_DAYS, commerceState, computeShield, inferCategory, projectMetrics, stageForScore } from "@/lib/shieldEngine";
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

/**
 * One shared brain for every page. It lives in the root layout, which Next.js keeps mounted while
 * you move between routes, so a scan made on /scan is still there on /audit, /track and /store.
 */
export interface AppState {
  /** Signed in with Google, or in the no-account demo guest mode */
  authed: boolean;
  guest: boolean;
  userId: string | null;
  firstName: string;
  changeGuest: (on: boolean) => void;

  baseline: SkinMetrics | null;
  metrics: SkinMetrics | null;
  shield: ShieldResult | null;
  commerce: CommerceState;
  /** Score the store follows: the live scan, else the latest saved session */
  suggestScore: number | null;

  day: number;
  changeDay: (d: number) => void;
  unlockedDay: number;
  advanceDay: () => void;

  shelf: ShelfProduct[];
  toggleProduct: (id: string) => void;
  addProduct: (name: string, active: string, category?: ActiveCategory) => void;
  removeProduct: (id: string) => void;

  photoUrl: string | null;
  heatmap: boolean;
  toggleHeatmap: () => void;
  analyzing: boolean;
  error: string | null;
  uploadPhoto: (file: File) => void;

  demoProfile: boolean;
  startBlankDemo: () => void;
  startSampleDemo: () => void;

  scans: StoredScan[];
  scansLoaded: boolean;
  clearHistory: () => void;
}

const Ctx = createContext<AppState | null>(null);

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be used inside <AppProvider>");
  return v;
}

export default function AppProvider({ children }: { children: React.ReactNode }) {
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
    setDay(1);
    setUnlockedDay(7);
    setPhotoUrl(null);
    setError(null);
    if (!userId) enterGuest();
    router.push("/scan");
  }, [leaveDemoProfile, userId, enterGuest, router]);

  const metrics = useMemo(() => (baseline ? projectMetrics(baseline, day) : null), [baseline, day]);
  const shield = useMemo(() => (metrics ? computeShield(shelf, metrics, day) : null), [shelf, metrics, day]);
  // Product suggestions follow the current scan, or the latest saved session when there is no live scan.
  const latestScan = scans[scans.length - 1];
  const suggestScore = shield?.score ?? latestScan?.metrics.shieldScore ?? null;
  const commerce = useMemo<CommerceState>(
    () =>
      suggestScore === null
        ? { unlocked: false, tier: "none" }
        : commerceState(shield ? shield.stage : stageForScore(suggestScore)),
    [shield, suggestScore],
  );

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

  const clearHistory = useCallback(() => {
    clearScans();
    setScans([]);
    if (userId) fetch("/api/scans", { method: "DELETE" }).catch(() => {});
  }, [userId]);

  const value: AppState = {
    authed: !!userId || guest,
    guest: guest && !userId,
    userId,
    firstName: session?.user?.name?.split(" ")[0] ?? "",
    changeGuest,
    baseline,
    metrics,
    shield,
    commerce,
    suggestScore,
    day,
    changeDay: setDay,
    unlockedDay,
    advanceDay,
    shelf,
    toggleProduct,
    addProduct,
    removeProduct,
    photoUrl,
    heatmap,
    toggleHeatmap: () => setHeatmap((h) => !h),
    analyzing,
    error,
    uploadPhoto,
    demoProfile,
    startBlankDemo,
    startSampleDemo,
    scans,
    scansLoaded,
    clearHistory,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
