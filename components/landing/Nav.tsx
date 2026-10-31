"use client";

import { useEffect, useState } from "react";
import { FlaskConical, Menu, X } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import AuthButton, { GoogleMark } from "./AuthButton";
import ThemeToggle from "./ThemeToggle";

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
  onDemoProfile: () => void;
}

export default function Nav({ authed, guest, onGuest, onDemoProfile }: Props) {
  const LINKS = authed ? APP_LINKS : LANDING_LINKS;
  const [open, setOpen] = useState(false);
  const { data: session } = authClient.useSession();
  const signedIn = !!session?.user && !guest;

  // Lock page scroll behind the drawer; close it on Escape.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      <nav
        className="fixed inset-x-0 top-0 z-50 flex h-[58px] items-center justify-between gap-2 border-b border-slate-700/40 px-3 backdrop-blur-md sm:px-4 md:px-8"
        style={{ background: "rgb(var(--c-slate-950) / 0.8)" }}
      >
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className="shrink-0 font-display text-lg font-bold tracking-tight"
        >
          DermShield<span className="text-emerald-500">.</span>
        </a>

        <ul className="hidden items-center gap-6 lg:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="text-[12px] font-medium tracking-wide text-slate-400 transition-colors hover:text-emerald-400"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onDemoProfile}
            className="hidden items-center gap-1.5 rounded-full border border-amber-400/50 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-300 transition hover:bg-amber-400/10 xl:inline-flex"
          >
            <FlaskConical className="h-3.5 w-3.5" /> Try demo
          </button>
          <div className="hidden lg:block">
            <AuthButton guest={guest} onGuest={onGuest} />
          </div>
          <div className="lg:hidden">
            <AuthButton guest={guest} onGuest={onGuest} compact />
          </div>
          <ThemeToggle />
          <a
            href="#console"
            className="rounded-full bg-emerald-500 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-950 transition hover:bg-emerald-400 sm:px-4"
          >
            {authed ? "New Scan" : <><span className="sm:hidden">Check Skin</span><span className="hidden sm:inline">Check My Skin</span></>}
          </a>
          <button
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 text-slate-200 lg:hidden"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu drawer */}
      {open && (
        <div className="fixed inset-0 top-[58px] z-40 lg:hidden" role="dialog" aria-label="Menu">
          <button aria-label="Close menu" onClick={close} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
          <div
            className="relative max-h-[calc(100dvh-58px)] overflow-y-auto border-b border-slate-700/50 px-4 pb-5 pt-3 shadow-2xl"
            style={{ background: "rgb(var(--c-slate-950) / 0.97)" }}
          >
            <ul className="divide-y divide-slate-800">
              {LINKS.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    onClick={close}
                    className="block py-3.5 text-base font-medium text-slate-100 transition hover:text-emerald-400"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>

            <div className="mt-4 grid gap-2.5">
              <button
                onClick={() => {
                  close();
                  onDemoProfile();
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-400/50 bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-300"
              >
                <FlaskConical className="h-4 w-4" /> Try demo profile
              </button>
              {!signedIn && !guest && (
                <button
                  onClick={() => {
                    close();
                    onGuest(true);
                  }}
                  className="rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-100"
                >
                  Demo login (no account)
                </button>
              )}
              {!signedIn && (
                <button
                  onClick={async () => {
                    close();
                    await authClient.signIn.social({ provider: "google", callbackURL: "/" });
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-100"
                >
                  <GoogleMark className="h-4 w-4" /> Sign in with Google
                </button>
              )}
              <a
                href="#console"
                onClick={close}
                className="rounded-xl bg-emerald-500 px-4 py-3 text-center text-sm font-semibold text-slate-950"
              >
                {authed ? "New scan" : "Check my skin"}
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
