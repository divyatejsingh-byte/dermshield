"use client";

import { useState } from "react";
import { LogOut, UserRound } from "lucide-react";
import { authClient } from "@/lib/auth/client";

/** Demo login is a no-account guest mode (scans stay in this browser); its state lives in the app. */
export default function AuthButton({ guest, onGuest }: { guest: boolean; onGuest: (on: boolean) => void }) {
  const { data: session, isPending } = authClient.useSession();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [toast, setToast] = useState(false);
  const startDemo = () => {
    onGuest(true);
    setToast(true);
    window.setTimeout(() => setToast(false), 5000);
  };
  const setGuestMode = onGuest;

  // Demo login never waits on the session check.
  const waiting = isPending && !guest;

  if (session?.user && !guest) {
    const name = session.user.name || session.user.email || "You";
    return (
      <div className="flex items-center gap-2">
        <span
          className="hidden max-w-[140px] truncate text-[11px] font-medium text-slate-300 md:block"
          title={session.user.email}
        >
          {name}
        </span>
        <button
          onClick={async () => {
            setBusy(true);
            await authClient.signOut();
            window.location.reload();
          }}
          disabled={busy}
          aria-label="Sign out"
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-300 transition hover:border-slate-500 disabled:opacity-50"
        >
          <LogOut className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    );
  }

  if (guest) {
    return (
      <div className="relative flex items-center gap-2">
        {toast && (
          <div role="status" className="absolute right-0 top-full mt-3 w-64 rounded-xl border border-amber-400/40 bg-slate-900 p-3 text-xs text-slate-200 shadow-xl">
            Demo guest started. Upload a photo or take a selfie below to see your results.
          </div>
        )}
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/50 bg-amber-400/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-200">
          <UserRound className="h-3.5 w-3.5" /> Demo guest
        </span>
        <button
          onClick={() => setGuestMode(false)}
          className="rounded-full border border-slate-700 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-300 transition hover:border-slate-500"
        >
          Exit demo
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
    <button
      onClick={startDemo}
      className="rounded-full border border-amber-400/50 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-200 transition hover:bg-amber-400/10"
    >
      Demo Login
    </button>
    <button
      onClick={async () => {
        setBusy(true);
        setFailed(false);
        try {
          const res = await authClient.signIn.social({ provider: "google", callbackURL: "/" });
          if (res?.error) throw new Error(res.error.message);
        } catch {
          setFailed(true);
          setBusy(false);
        }
      }}
      disabled={busy || waiting}
      title={failed ? "Sign-in failed. Try again." : undefined}
      className="inline-flex items-center gap-2 rounded-full border border-slate-600 bg-slate-900/60 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-100 transition hover:border-emerald-500 disabled:opacity-50"
    >
      <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden>
        <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
        <path fill="#FBBC05" d="M10.5 28.7c-.5-1.5-.8-3.1-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.100 0 24s.9 7.600 2.600 10.800l7.900-6.100z" />
        <path fill="#34A853" d="M24 48c6.500 0 11.900-2.100 15.900-5.800l-7.500-5.800c-2.100 1.400-4.800 2.300-8.400 2.300-6.300 0-11.600-4.100-13.500-9.800l-7.900 6.100C6.500 42.600 14.600 48 24 48z" />
      </svg>
      {busy ? "Opening Google…" : failed ? "Try again" : <><span className="hidden sm:inline">Sign in with </span>Google</>}
    </button>
    </div>
  );
}
