export type Tone = "rose" | "amber" | "emerald";

export const TONE = {
  rose: {
    text: "text-rose-300",
    badge: "bg-rose-500/15 text-rose-300 ring-rose-500/40",
    bar: "bg-rose-500",
    stroke: "#f43f5e",
    border: "border-rose-500/40",
    glow: "shadow-rose-500/10",
  },
  amber: {
    text: "text-amber-300",
    badge: "bg-amber-500/15 text-amber-300 ring-amber-500/40",
    bar: "bg-amber-400",
    stroke: "#fbbf24",
    border: "border-amber-500/40",
    glow: "shadow-amber-500/10",
  },
  emerald: {
    text: "text-emerald-300",
    badge: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/40",
    bar: "bg-emerald-500",
    stroke: "#10b981",
    border: "border-emerald-500/40",
    glow: "shadow-emerald-500/10",
  },
} as const;
