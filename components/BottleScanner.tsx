"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, ImageUp, Lock, ScanText, Sparkles, X } from "lucide-react";
import { analyzeBottle, offlineSampleResult, renderSampleLabel, toJpegBase64, type BottleResult } from "@/lib/bottleLabel";

interface Props {
  /** Latest redness reading, or null when the user hasn't scanned their face yet */
  redness: number | null;
  existing: Array<{ name: string }>;
  /** Called once a label has been read. `offline` is true for the built-in sample fallback. */
  onResult: (result: BottleResult, meta: { offline: boolean }) => void;
  onClose: () => void;
}

type View = "choose" | "camera" | "reading" | "error";

/** Snap or upload the back of a bottle; Gemini reads the ingredient list. */
export default function BottleScanner({ redness, existing, onResult, onClose }: Props) {
  const [view, setView] = useState<View>("choose");
  const [error, setError] = useState<string | null>(null);
  const [camError, setCamError] = useState<string | null>(null);
  const [camReady, setCamReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      stopCamera();
    };
  }, [onClose, stopCamera]);

  // Live camera (rear camera preferred) while on the camera view.
  useEffect(() => {
    if (view !== "camera") return;
    setCamReady(false);
    setCamError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamError("Your browser can't open the camera here. Upload a photo instead.");
      return;
    }
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 } }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const v = videoRef.current;
        if (v) {
          v.srcObject = stream;
          v.play().catch(() => {});
        }
      })
      .catch((e: DOMException) =>
        setCamError(
          e.name === "NotAllowedError"
            ? "Camera access was blocked. Allow it in your browser, or upload a photo instead."
            : "Couldn't start the camera. Upload a photo instead.",
        ),
      );
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [view, stopCamera]);

  const read = useCallback(
    async (getBase64: () => Promise<string>, sample = false) => {
      stopCamera();
      setView("reading");
      setError(null);
      try {
        const imageBase64 = await getBase64();
        const out = await analyzeBottle(imageBase64, redness, existing);
        if (out.ok) {
          onResult(out.result, { offline: false });
          return;
        }
        // The built-in sample must always be demonstrable, even if live reading is unavailable.
        if (sample && (out.status === 503 || out.status === 502 || out.status === 504 || out.status === 0)) {
          onResult(offlineSampleResult(redness), { offline: true });
          return;
        }
        setError(out.error);
        setView("error");
      } catch {
        setError("We couldn't prepare that photo. Please try a different one.");
        setView("error");
      }
    },
    [existing, onResult, redness, stopCamera],
  );

  const onFile = (file: File | undefined) => {
    if (file) read(() => toJpegBase64(file));
  };

  const snap = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d")?.drawImage(v, 0, 0);
    c.toBlob(
      (blob) => {
        if (blob) read(() => toJpegBase64(blob));
      },
      "image/jpeg",
      0.92,
    );
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Scan a bottle label">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
      <div className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold tracking-tight">Scan bottle label</h2>
            <p className="mt-1 text-sm text-slate-400">
              Photograph the back of the bottle, where the ingredients are printed.
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            onFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />

        {view === "choose" && (
          <div className="space-y-2.5">
            <button
              onClick={() => setView("camera")}
              className="flex w-full items-center gap-3 rounded-xl border border-slate-700 bg-slate-950/50 p-3.5 text-left transition hover:border-emerald-500"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/40">
                <Camera className="h-5 w-5 text-emerald-400" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-slate-100">Use camera</span>
                <span className="block text-xs text-slate-400">Point at the ingredient list and capture.</span>
              </span>
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="flex w-full items-center gap-3 rounded-xl border border-slate-700 bg-slate-950/50 p-3.5 text-left transition hover:border-emerald-500"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-800 ring-1 ring-slate-700">
                <ImageUp className="h-5 w-5 text-slate-300" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-slate-100">Upload or take a photo</span>
                <span className="block text-xs text-slate-400">On a phone this opens your camera.</span>
              </span>
            </button>
            <button
              onClick={() => read(renderSampleLabel, true)}
              className="flex w-full items-center gap-3 rounded-xl border border-amber-400/40 bg-amber-400/5 p-3.5 text-left transition hover:border-amber-400"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-400/15 ring-1 ring-amber-400/40">
                <Sparkles className="h-5 w-5 text-amber-300" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-slate-100">Try sample label</span>
                <span className="block text-xs text-slate-400">A salicylic acid 2% bottle. No product needed.</span>
              </span>
            </button>
          </div>
        )}

        {view === "camera" && (
          <div>
            {camError ? (
              <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{camError}</p>
            ) : (
              <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-black">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  onLoadedData={() => setCamReady(true)}
                  className="h-full w-full object-cover"
                />
                <div className="pointer-events-none absolute inset-x-[8%] inset-y-[18%] rounded-lg border-2 border-dashed border-emerald-400/70" />
              </div>
            )}
            <p className="mt-2 text-center text-xs text-slate-400">
              Fill the box with the ingredient list. Good light and a steady hand help.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => {
                  stopCamera();
                  setView("choose");
                }}
                className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-200"
              >
                Back
              </button>
              {!camError && (
                <button
                  onClick={snap}
                  disabled={!camReady}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-50"
                >
                  <Camera className="h-4 w-4" /> Capture label
                </button>
              )}
            </div>
          </div>
        )}

        {view === "reading" && (
          <div className="flex flex-col items-center gap-4 py-8 text-center" role="status" aria-live="polite">
            <div className="relative flex h-16 w-16 items-center justify-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/20" />
              <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/50">
                <ScanText className="h-7 w-7 animate-pulse text-emerald-400" />
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-100">Gemini AI reading label ingredients &amp; contraindications...</p>
              <p className="mt-1 text-xs text-slate-400">This usually takes a few seconds.</p>
            </div>
          </div>
        )}

        {view === "error" && (
          <div className="space-y-3">
            <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
              {error}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setView("choose")}
                className="rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
              >
                Try again
              </button>
              <button
                onClick={() => read(renderSampleLabel, true)}
                className="rounded-lg border border-amber-400/50 px-4 py-2.5 text-sm font-semibold text-amber-300 transition hover:bg-amber-400/10"
              >
                Try sample label
              </button>
            </div>
          </div>
        )}

        <p className="mt-4 flex items-start gap-2 text-[11px] leading-relaxed text-slate-500">
          <Lock className="mt-0.5 h-3 w-3 shrink-0" />
          The label photo is sent securely to Google&apos;s Gemini AI to read the ingredients. DermShield does not
          store it.
        </p>
      </div>
    </div>
  );
}
