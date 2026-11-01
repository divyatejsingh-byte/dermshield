"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FlaskConical, Menu, X } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { cn } from "@/lib/utils";
import { useSkin } from "@/context/SkinContext";
import AuthButton, { GoogleMark } from "./AuthButton";
import DemoChooser from "./DemoChooser";
import ThemeToggle from "./ThemeToggle";

const LINKS = [
  { href: "/how-it-works", label: "How It Works" },
  { href: "/audit", label: "Audit Products" },
  { href: "/track", label: "Track Healing" },
  { href: "/store", label: "Safe Store" },
];

/** Shared top bar and mobile drawer. Lives in the root layout, so it stays put between pages. */
export default function Nav() {
  const { authed, guest, changeGuest, startBlankDemo, loadDemoProfile } = useSkin();
  const pathname = usePathname();
  const links = authed ? [{ href: "/", label: "Dashboard" }, ...LINKS] : LINKS;
  const [open, setOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
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

  // Any navigation closes the drawer.
  useEffect(() => setOpen(false), [pathname]);

  const close = () => setOpen(false);
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <>
      <nav
        className="fixed inset-x-0 top-0 z-50 flex h-[58px] items-center justify-between gap-2 border-b border-slate-700/40 px-3 backdrop-blur-md sm:px-4 md:px-8"
        style={{ background: "rgb(var(--c-slate-950) / 0.8)" }}
      >
        <Link href="/" className="shrink-0 font-display text-lg font-bold tracking-tight">
          DermShield<span className="text-emerald-500">.</span>
        </Link>

        <ul className="hidden items-center gap-5 lg:flex xl:gap-6">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={isActive(l.href) ? "page" : undefined}
                className={cn(
                  "text-[12px] font-medium tracking-wide transition-colors hover:text-emerald-400",
                  isActive(l.href) ? "text-emerald-400" : "text-slate-400",
                )}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setDemoOpen(true)}
            className="hidden items-center gap-1.5 rounded-full border border-amber-400/50 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-300 transition hover:bg-amber-400/10 md:inline-flex"
          >
            <FlaskConical className="h-3.5 w-3.5" /> Try demo
          </button>
          <div className="hidden lg:block">
            <AuthButton guest={guest} onGuest={changeGuest} />
          </div>
          <div className="lg:hidden">
            <AuthButton guest={guest} onGuest={changeGuest} compact />
          </div>
          <ThemeToggle />
          <Link
            href="/scan"
            className="rounded-full bg-emerald-500 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-950 transition hover:bg-emerald-400 sm:px-4"
          >
            {authed ? (
              "New Scan"
            ) : (
              <>
                <span className="sm:hidden">Check Skin</span>
                <span className="hidden sm:inline">Check My Skin</span>
              </>
            )}
          </Link>
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
              {links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    onClick={close}
                    className={cn(
                      "block py-3.5 text-base font-medium transition hover:text-emerald-400",
                      isActive(l.href) ? "text-emerald-400" : "text-slate-100",
                    )}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-4 grid gap-2.5">
              <button
                onClick={() => {
                  close();
                  setDemoOpen(true);
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-400/50 bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-300"
              >
                <FlaskConical className="h-4 w-4" /> Try demo
              </button>
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
              <Link
                href="/scan"
                onClick={close}
                className="rounded-xl bg-emerald-500 px-4 py-3 text-center text-sm font-semibold text-slate-950"
              >
                {authed ? "New scan" : "Check my skin"}
              </Link>
            </div>
          </div>
        </div>
      )}

      {demoOpen && (
        <DemoChooser
          onClose={() => setDemoOpen(false)}
          onBlank={() => {
            setDemoOpen(false);
            startBlankDemo();
          }}
          onSample={() => {
            setDemoOpen(false);
            loadDemoProfile();
          }}
        />
      )}
    </>
  );
}
