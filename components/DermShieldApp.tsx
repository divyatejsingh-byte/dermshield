"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlaskConical } from "lucide-react";
import { TIMELINE_DAYS, commerceState, computeShield, inferCategory, projectMetrics, stageForScore } from "@/lib/shieldEngine";
import { clearScans, loadScans, saveScans, stageToStored } from "@/lib/scanStore";
import type { ActiveCategory, ShelfProduct, SkinAnalysis, SkinMetrics, Stage, StoredScan } from "@/types/dermshield";
import BiometricsPanel from "./BiometricsPanel";
import CommerceSection from "./CommerceSection";
import Header from "./Header";
import ShelfAuditor from "./ShelfAuditor";
import TimelineScrubber from "./TimelineScrubber";
import Close from "./landing/Close";
import Dashboard from "./Dashboard";
import ProgressHistory from "./landing/ProgressHistory";
import Nav from "./landing/Nav";
import RecoveryEngine from "./landing/RecoveryEngine";
import RosterLedger from "./landing/RosterLedger";
import HowItWorks from "./landing/HowItWorks";
import Statement from "./landing/Statement";
import { useScrollVars } from "./landing/useScrollVars";
import { authClient } from "@/lib/auth/client";
import { DEMO_METRICS, DEMO_PROFILE_LABEL, DEMO_SHELF } from "@/lib/demoProfile";

export default function DermShieldApp({ hero }: { hero?: React.ReactNode }) {
  // The day-1 scan. The scrubber projects recovery forward from this baseline.
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
  // Demo login: a no-account guest mode, remembered in this browser.
  const [guest, setGuestState] = useState(false);
  useEffect(() => {
    try {
      setGuestState(window.localStorage.getItem("dermshield_guest") === "1");
    } catch {
      /* storage unavailable */
    }
  }, []);
  const changeGuest = (on: boolean) => {
    setGuestState(on);
    try {
      window.localStorage.setItem("dermshield_guest", on ? "1" : "0");
    } catch {
      /* ignore */
    }
    if (on) window.scrollTo({ top: 0 });
    else leaveDemoProfile();
  };

  const heroRef = useRef<HTMLElement>(null); // unused: PortalHero tracks its own progress
  useScrollVars(heroRef);

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

  const startDemoProfile = useCallback(() => {
    if (!demoProfile) realShelfRef.current = shelfRef.current;
    setDemoProfile(true);
    setBaseline(DEMO_METRICS);
    setShelf(DEMO_SHELF);
    setPhotoUrl(null);
    setError(null);
    setDay(1);
    setUnlockedDay(1);
    if (!userId) {
      setGuestState(true);
      try {
        window.localStorage.setItem("dermshield_guest", "1");
      } catch {
        /* ignore */
      }
      const r = computeShield(DEMO_SHELF, DEMO_METRICS, 1);
      recordScan(DEMO_METRICS, r.score, r.stage);
    }
    window.setTimeout(() => {
      document.getElementById("console")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 200);
  }, [demoProfile, userId, recordScan]);

  // The photo hero (a server-rendered slot) asks for the demo through a window event.
  useEffect(() => {
    const on = () => startDemoProfile();
    window.addEventListener("dermshield:demo", on);
    return () => window.removeEventListener("dermshield:demo", on);
  }, [startDemoProfile]);

  const metrics = useMemo(() => (baseline ? projectMetrics(baseline, day) : null), [baseline, day]);
  const shield = useMemo(
    () => (metrics ? computeShield(shelf, metrics, day) : null),
    [shelf, metrics, day],
  );
  // Product suggestions follow the current scan, or the latest saved session when there is no live scan.
  const latestScan = scans[scans.length - 1];
  const suggestScore = shield?.score ?? latestScan?.metrics.shieldScore ?? null;
  const commerce = useMemo(
    () =>
      suggestScore === null
        ? { unlocked: false, tier: "none" as const }
        : commerceState(shield ? shield.stage : stageForScore(suggestScore)),
    [shield, suggestScore],
  );

  useEffect(() => {
    return () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    };
  }, [photoUrl]);

  const handleUpload = useCallback(async (file: File) => {
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
  }, [recordScan]);

  const changeDay = (d: number) => setDay(d);

  const toggle = (id: string) =>
    setShelf((s) => s.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p)));

  const add = (name: string, active: string, category?: ActiveCategory) =>
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
    ]);

  const remove = (id: string) => setShelf((s) => s.filter((p) => p.id !== id));

  const authed = !!userId || guest;

  return (
    <div className="min-h-screen overflow-x-clip">
      <Nav authed={authed} guest={guest} onGuest={changeGuest} onDemoProfile={startDemoProfile} />
      {authed ? (
        <Dashboard
          name={session?.user?.name?.split(" ")[0] ?? ""}
          guest={guest && !userId}
          scans={scans}
          loaded={scansLoaded}
        />
      ) : (
        <>
          {hero}
          <Statement />
          <HowItWorks />
          <RosterLedger shelf={shelf} shield={shield} metrics={metrics} onAdd={add} />
          <RecoveryEngine baseline={baseline} day={day} onDay={changeDay} />
        </>
      )}
      <ProgressHistory
        scans={scans}
        signedIn={!!userId}
        onClear={() => {
          clearScans();
          setScans([]);
          if (userId) fetch("/api/scans", { method: "DELETE" }).catch(() => {});
        }}
      />

      <section id="console" className="mx-auto max-w-7xl scroll-mt-20 space-y-6 px-4 py-12 sm:px-6 md:py-24">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-400">
            {authed ? "NEW SCAN" : "YOUR SKIN CHECK"}
          </p>
          <button
            onClick={startDemoProfile}
            className="inline-flex items-center gap-2 rounded-full border border-amber-400/50 px-4 py-2 text-xs font-semibold text-amber-300 transition hover:bg-amber-400/10"
          >
            <FlaskConical className="h-3.5 w-3.5" /> {DEMO_PROFILE_LABEL}
          </button>
        </div>
        {demoProfile && (
          <p role="status" className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
            Demo profile: these are sample results for an over-exfoliated face, not your skin. Upload a photo or
            take a selfie to replace them with your own.
          </p>
        )}
        {shield && <Header score={shield.score} stage={shield.stage} />}
        <div className="grid gap-8 lg:grid-cols-2">
          <BiometricsPanel
            metrics={metrics}
            photoUrl={photoUrl}
            heatmap={heatmap}
            onToggleHeatmap={() => setHeatmap((h) => !h)}
            onUpload={handleUpload}
            analyzing={analyzing}
            error={error}
          />
          <ShelfAuditor
            shelf={shelf}
            shield={shield}
            metrics={metrics}
            day={day}
            onToggle={toggle}
            onAdd={add}
            onRemove={remove}
          />
        </div>
        <div id="timeline" className="scroll-mt-20">
          {baseline && (
            <TimelineScrubber
              day={day}
              onDay={changeDay}
              unlockedDay={unlockedDay}
              onAdvance={
                unlockedDay < 7
                  ? () => {
                      const next = TIMELINE_DAYS.find((d) => d > unlockedDay) ?? 7;
                      setUnlockedDay(next);
                      setDay(next);
                    }
                  : undefined
              }
            />
          )}
        </div>
        <div id="market" className="scroll-mt-20">
          <CommerceSection commerce={commerce} score={suggestScore ?? 0} scanned={suggestScore !== null} />
        </div>
      </section>

      {!authed && <Close />}
    </div>
  );
}
