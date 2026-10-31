"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Loader2, ScanBarcode, Search, X } from "lucide-react";
import { CATEGORY_LABEL } from "@/lib/shieldEngine";
import { cn } from "@/lib/utils";
import type { ActiveCategory } from "@/types/dermshield";

interface Found {
  barcode: string;
  name: string;
  category: ActiveCategory;
  active: string;
  hasIngredients: boolean;
}

interface Props {
  onPick: (name: string, active: string, category: ActiveCategory) => void;
  onClose: () => void;
}

/* The Barcode Detection API is not in every browser, so it is read through a loose type. */
type Detector = { detect: (src: CanvasImageSource) => Promise<Array<{ rawValue: string }>> };
type DetectorCtor = new (opts: { formats: string[] }) => Detector;

export default function ProductScanner({ onPick, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [mode, setMode] = useState<"camera" | "search">("camera");
  const [camError, setCamError] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Found[] | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const lookup = useCallback(async (params: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/lookup?${params}`);
      const body = (await res.json()) as { products?: Found[]; error?: string };
      if (!res.ok) throw new Error(body.error ?? "Lookup failed.");
      setResults(body.products ?? []);
    } catch (e) {
      setResults(null);
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, []);

  // Camera + barcode loop (only while on the camera tab with no results showing).
  useEffect(() => {
    if (mode !== "camera" || results) return;
    const Ctor = (window as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;
    setSupported(!!Ctor);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamError("Your browser can't open the camera here. Search by name instead.");
      return;
    }
    let cancelled = false;
    let timer: number | undefined;

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const v = videoRef.current;
        if (!v) return;
        v.srcObject = stream;
        v.play().catch(() => {});
        if (!Ctor) return;
        const detector = new Ctor({ formats: ["ean_13", "ean_8", "upc_a", "upc_e"] });
        let locked = false;
        timer = window.setInterval(async () => {
          if (locked || !v.videoWidth) return;
          try {
            const codes = await detector.detect(v);
            if (codes[0]?.rawValue) {
              locked = true;
              window.clearInterval(timer);
              stop();
              lookup(`barcode=${encodeURIComponent(codes[0].rawValue)}`);
            }
          } catch {
            /* frame not ready yet */
          }
        }, 450);
      })
      .catch((e: DOMException) => {
        setCamError(
          e.name === "NotAllowedError"
            ? "Camera access was blocked. Allow it in your browser, or search by name."
            : "Couldn't start the camera. Search by name instead.",
        );
      });

    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
      stop();
    };
  }, [mode, results, lookup, stop]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    stop();
    lookup(/^\d{8,14}$/.test(t) ? `barcode=${t}` : `q=${encodeURIComponent(t)}`);
  };

  const reset = () => {
    setResults(null);
    setError(null);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur"
      role="dialog"
      aria-label="Scan a product"
    >
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-100">Scan a product you use</h3>
          <button
            onClick={() => {
              stop();
              onClose();
            }}
            aria-label="Close"
            className="rounded-full p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-1 rounded-lg bg-slate-950 p-1 text-xs font-medium">
          {(
            [
              ["camera", "Scan barcode", ScanBarcode],
              ["search", "Search by name", Search],
            ] as const
          ).map(([m, label, Icon]) => (
            <button
              key={m}
              onClick={() => {
                reset();
                setMode(m);
              }}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-md px-3 py-2 transition",
                mode === m ? "bg-slate-800 text-slate-100" : "text-slate-400 hover:text-slate-200",
              )}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>

        {busy ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Looking up product…
          </div>
        ) : results ? (
          <div className="space-y-2">
            {results.length === 0 ? (
              <p className="rounded-lg border border-slate-700 p-3 text-sm text-slate-300">
                We couldn&apos;t find that product. Try searching by name, or add it by hand with its main
                ingredient.
              </p>
            ) : (
              results.map((p) => (
                <div key={p.barcode + p.name} className="rounded-xl border border-slate-700 bg-slate-950 p-3">
                  <p className="text-sm font-medium text-slate-100">{p.name}</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {p.hasIngredients ? (
                      <>{CATEGORY_LABEL[p.category]} · from its ingredient list</>
                    ) : (
                      "Ingredients not listed, so we can't check it. It will count as neutral."
                    )}
                  </p>
                  <button
                    onClick={() => onPick(p.name, p.active, p.category)}
                    className="mt-2 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-emerald-400"
                  >
                    Add to my products
                  </button>
                </div>
              ))
            )}
            <button onClick={reset} className="text-xs text-slate-400 underline hover:text-slate-200">
              Scan or search again
            </button>
          </div>
        ) : mode === "camera" ? (
          camError ? (
            <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
              {camError}
            </p>
          ) : (
            <>
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-black">
                <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
                <div className="pointer-events-none absolute inset-x-[10%] inset-y-[30%] rounded-lg border-2 border-emerald-400/70" />
              </div>
              <p className="mt-2 text-center text-xs text-slate-400">
                {supported
                  ? "Hold the barcode inside the box. It reads automatically."
                  : "This browser can't read barcodes from the camera. Type the number below, or search by name."}
              </p>
              <form onSubmit={submit} className="mt-3 flex gap-2">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  inputMode="numeric"
                  placeholder="Or type the barcode number"
                  aria-label="Barcode number"
                  className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none placeholder:text-slate-600 focus:border-emerald-500"
                />
                <button
                  type="submit"
                  disabled={!text.trim()}
                  className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-900 disabled:opacity-40"
                >
                  Look up
                </button>
              </form>
            </>
          )
        ) : (
          <form onSubmit={submit} className="space-y-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g. CeraVe Hydrating Cleanser"
              aria-label="Product name"
              autoFocus
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none placeholder:text-slate-600 focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={text.trim().length < 3}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-40"
            >
              <Camera className="hidden h-4 w-4" />
              <Search className="h-4 w-4" /> Search
            </button>
          </form>
        )}

        {error && <p className="mt-3 text-xs text-rose-300">{error}</p>}
        <p className="mt-3 text-[11px] text-slate-500">
          Product data comes from Open Beauty Facts, a community database. Some products are missing or
          incomplete.
        </p>
      </div>
    </div>
  );
}
