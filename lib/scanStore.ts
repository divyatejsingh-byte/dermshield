import type { Stage, StoredScan } from "@/types/dermshield";

/** Guest-only scan history. Lives in this browser's localStorage; no account needed. */
export const SCANS_KEY = "dermshield_scans";
const MAX_SCANS = 30;

export function stageToStored(stage: Stage): StoredScan["stage"] {
  return stage === "acute" ? "compromised" : stage === "rehab" ? "healing" : "restored";
}

export function loadScans(): StoredScan[] {
  try {
    const raw = window.localStorage.getItem(SCANS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (s): s is StoredScan =>
        !!s &&
        typeof s.id === "string" &&
        typeof s.dayNumber === "number" &&
        typeof s.timestamp === "number" &&
        !!s.metrics &&
        typeof s.metrics.shieldScore === "number",
    );
  } catch {
    return [];
  }
}

export function saveScans(scans: StoredScan[]): void {
  try {
    window.localStorage.setItem(SCANS_KEY, JSON.stringify(scans.slice(-MAX_SCANS)));
  } catch {
    /* storage full or blocked (private mode) - history just won't persist */
  }
}

export function clearScans(): void {
  try {
    window.localStorage.removeItem(SCANS_KEY);
  } catch {
    /* ignore */
  }
}
