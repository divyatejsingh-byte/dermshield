import Link from "next/link";
import { BarChart3, Camera, ClipboardCheck, ShoppingBag, Sparkles } from "lucide-react";

const TOOLS = [
  {
    href: "/scan",
    icon: Camera,
    title: "Check your skin",
    body: "Upload a selfie or take one now. We read redness, breakouts, texture and moisture in seconds.",
    cta: "Open scanner",
  },
  {
    href: "/audit",
    icon: ClipboardCheck,
    title: "Audit your products",
    body: "Add what you use. We pause the harsh acids and retinols that are hurting your skin for 5 days.",
    cta: "Open tool",
  },
  {
    href: "/track",
    icon: BarChart3,
    title: "Track healing",
    body: "Watch your skin recover day by day, and see when it is safe to bring products back.",
    cta: "Open tool",
  },
  {
    href: "/store",
    icon: ShoppingBag,
    title: "Safe Store",
    body: "Gentle pharmacy essentials and brands with live prices, unlocked as your skin heals.",
    cta: "Open store",
  },
  {
    href: "/how-it-works",
    icon: Sparkles,
    title: "How it works",
    body: "Three simple steps: scan, pause the culprits, and rebuild your skin's natural shield.",
    cta: "Learn more",
  },
];

/** Short previews of every tool on the landing page and dashboard, each linking to its own page. */
export default function ToolPreviews({ title = "Everything in one place" }: { title?: string }) {
  return (
    <section className="px-5 py-12 md:px-16 md:py-24">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-400">THE TOOLS</p>
      <h2 className="mb-8 max-w-3xl font-display text-[clamp(26px,3.8vw,48px)] font-bold leading-[1.08] tracking-tight">
        {title}
      </h2>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map(({ href, icon: Icon, title: t, body, cta }) => (
          <li key={href}>
            <Link
              href={href}
              className="group flex h-full flex-col rounded-2xl border border-slate-800 bg-slate-900/50 p-5 transition hover:border-emerald-500/50 hover:bg-slate-900"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/30">
                <Icon className="h-5 w-5 text-emerald-400" />
              </span>
              <h3 className="mt-4 font-display text-xl font-bold tracking-tight">{t}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-400">{body}</p>
              <span className="mt-4 text-sm font-semibold text-emerald-400 transition group-hover:text-emerald-300">
                {cta} →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
