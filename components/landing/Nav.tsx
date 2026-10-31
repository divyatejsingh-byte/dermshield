"use client";

import AuthButton from "./AuthButton";

const LANDING_LINKS = [
  { href: "#how", label: "How It Works" },
  { href: "#roster", label: "Audit Products" },
  { href: "#engine", label: "Track Healing" },
  { href: "#market", label: "Safe Store" },
];

const APP_LINKS = [
  { href: "#dashboard", label: "Dashboard" },
  { href: "#console", label: "New Scan" },
  { href: "#progress", label: "Progress" },
  { href: "#market", label: "Products" },
];

interface Props {
  authed: boolean;
  guest: boolean;
  onGuest: (on: boolean) => void;
}

export default function Nav({ authed, guest, onGuest }: Props) {
  const LINKS = authed ? APP_LINKS : LANDING_LINKS;
  return (
    <nav
      className="fixed inset-x-0 top-0 z-50 flex h-[58px] items-center justify-between gap-3 border-b border-emerald-500/20 px-4 backdrop-blur-[14px] md:px-8"
      style={{ background: "rgba(2, 6, 23, 0.75)" }}
    >
      <a
        href="#top"
        onClick={(e) => {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        className="shrink-0 font-display text-[15px] font-bold tracking-tight"
      >
        DermShield<span className="text-emerald-500">.</span>
      </a>

      <ul className="hidden items-center gap-6 lg:flex">
        {LINKS.map((l) => (
          <li key={l.href}>
            <a
              href={l.href}
              className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-slate-400 transition-colors hover:text-emerald-400"
            >
              {l.label}
            </a>
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-3">
        <AuthButton guest={guest} onGuest={onGuest} />
        <a
          href="#console"
          className="hidden rounded-full bg-emerald-500 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-950 transition hover:bg-emerald-400 sm:block"
        >
          {authed ? "New Scan" : "Check My Skin"}
        </a>
      </div>
    </nav>
  );
}
