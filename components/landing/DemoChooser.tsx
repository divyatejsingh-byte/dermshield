"use client";

import { useEffect } from "react";
import { Camera, FlaskConical, X } from "lucide-react";

interface Props {
  onBlank: () => void;
  onSample: () => void;
  onClose: () => void;
}

/** The single "Try Demo" entry point: your own face on a blank profile, or a filled sample profile. */
export default function DemoChooser({ onBlank, onSample, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Try the demo">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" />
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl sm:p-6">
        <div className="mb-1 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight">Try the demo</h2>
            <p className="mt-1 text-sm text-slate-400">No account needed. Pick how you want to start.</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            onClick={onBlank}
            className="group flex flex-col items-start gap-3 rounded-xl border border-slate-700 bg-slate-950/50 p-4 text-left transition hover:border-emerald-500"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/40">
              <Camera className="h-5 w-5 text-emerald-400" />
            </span>
            <span>
              <span className="block text-base font-semibold text-slate-100">Start with a blank profile</span>
              <span className="mt-1 block text-sm text-slate-400">
                An empty page. Scan your own face and add your own products to see real results.
              </span>
            </span>
            <span className="mt-auto text-sm font-semibold text-emerald-400 group-hover:text-emerald-300">
              Try with my face →
            </span>
          </button>

          <button
            onClick={onSample}
            className="group flex flex-col items-start gap-3 rounded-xl border border-slate-700 bg-slate-950/50 p-4 text-left transition hover:border-amber-400"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-400/15 ring-1 ring-amber-400/40">
              <FlaskConical className="h-5 w-5 text-amber-300" />
            </span>
            <span>
              <span className="block text-base font-semibold text-slate-100">Use a sample profile</span>
              <span className="mt-1 block text-sm text-slate-400">
                Everything filled in: an over-exfoliated face, paused products and a healing timeline. Sample data, not
                a real person.
              </span>
            </span>
            <span className="mt-auto text-sm font-semibold text-amber-300 group-hover:text-amber-200">
              Show me the sample →
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
