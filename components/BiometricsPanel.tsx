"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Flame, Loader2, Sparkles, Upload, Droplets, Waves, Eye, EyeOff, Camera, X } from "lucide-react";
import { useAnimatedNumber } from "@/lib/useAnimatedNumber";
import { cn } from "@/lib/utils";
import type { SkinMetrics } from "@/types/dermshield";
import { TONE, type Tone } from "./tone";

interface Props {
  metrics: SkinMetrics | null;
  photoUrl: string | null;
  heatmap: boolean;
  onToggleHeatmap: () => void;
  onUpload: (file: File) => void;
  analyzing: boolean;
  error: string | null;
}

function toneFor(value: number, higherIsWorse: boolean): Tone {
  const bad = higherIsWorse ? value : 100 - value;
  return bad >= 60 ? "rose" : bad >= 35 ? "amber" : "emerald";
}

function MetricCard({
  label,
  hint,
  value,
  higherIsWorse,
  icon: Icon,
}: {
  label: string;
  hint: string;
  value: number;
  higherIsWorse: boolean;
  icon: typeof Flame;
}) {
  const shown = useAnimatedNumber(value, 700);
  const tone = TONE[toneFor(value, higherIsWorse)];
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
          <Icon className={cn("h-4 w-4", tone.text)} />
          {label}
        </div>
        <span className={cn("text-lg font-semibold tabular-nums", tone.text)}>
          {Math.round(shown)}
          <span className="text-xs text-slate-500">/100</span>
        </span>
      </div>
      <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-slate-800">
        <div
          className={cn("h-full rounded-full transition-colors duration-500", tone.bar)}
          style={{ width: `${Math.min(100, Math.max(0, shown))}%` }}
        />
      </div>
      <p className="mt-1.5 text-[11px] text-slate-500">{hint}</p>
    </div>
  );
}

/** Empty state before the user's own photo: just a framing guide, no stock imagery. */
function PhotoPlaceholder() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-5 bg-gradient-to-b from-slate-900 to-slate-950 px-6 text-center">
      <div className="flex aspect-[4/5] w-[52%] items-center justify-center rounded-[50%] border-2 border-dashed border-emerald-400/50">
        <Camera className="h-8 w-8 text-emerald-400/70" />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-200">Add a clear, front-facing photo</p>
        <p className="mt-1 text-xs text-slate-500">Good light, whole face in view, no glasses.</p>
      </div>
    </div>
  );
}

function HeatOverlay({ metrics }: { metrics: SkinMetrics }) {
  const r = metrics.redness / 100;
  const t = metrics.roughness / 100;
  const spot = (x: number, y: number, size: number, rgb: string, a: number) =>
    `radial-gradient(circle at ${x}% ${y}%, rgba(${rgb},${a.toFixed(2)}) 0%, rgba(${rgb},0) ${size}%)`;
  const background = [
    spot(30, 52, 22, "244,63,94", 0.85 * r),
    spot(70, 52, 22, "244,63,94", 0.85 * r),
    spot(50, 50, 13, "244,63,94", 0.7 * r),
    spot(50, 30, 20, "251,146,60", 0.6 * t),
    spot(50, 72, 16, "251,191,36", 0.55 * t),
  ].join(",");
  return (
    <div
      className="pointer-events-none absolute inset-0 mix-blend-screen transition-opacity duration-700"
      style={{ background }}
    />
  );
}


/** Live camera capture (desktop webcams + phones). Hands a JPEG File back via onCapture. */
function CameraModal({ onCapture, onClose }: { onCapture: (f: File) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!navigator.mediaDevices?.getUserMedia) {
      setErr("Your browser can't open the camera here. Use Upload photo instead.");
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 1280 } }, audio: false })
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
      .catch((e: DOMException) => {
        setErr(
          e.name === "NotAllowedError"
            ? "Camera access was blocked. Allow the camera in your browser, or use Upload photo."
            : e.name === "NotFoundError"
              ? "No camera found on this device. Use Upload photo instead."
              : "Couldn't start the camera. Use Upload photo instead.",
        );
      });
    return () => {
      cancelled = true;
      stop();
    };
  }, [stop]);

  const snap = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d")?.drawImage(v, 0, 0);
    c.toBlob(
      (blob) => {
        if (!blob) return;
        stop();
        onCapture(new File([blob], "selfie.jpg", { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.92,
    );
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur" role="dialog" aria-label="Take a selfie">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-100">Take a selfie</h3>
          <button onClick={() => { stop(); onClose(); }} aria-label="Close camera" className="rounded-full p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        {err ? (
          <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{err}</p>
        ) : (
          <>
            <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-black">
              <video
                ref={videoRef}
                playsInline
                muted
                onLoadedData={() => setReady(true)}
                className="h-full w-full -scale-x-100 object-cover"
              />
              <div className="pointer-events-none absolute inset-[12%] rounded-[50%] border-2 border-dashed border-emerald-400/60" />
            </div>
            <p className="mt-2 text-center text-xs text-slate-400">
              Face the light, keep your whole face in the oval, and remove glasses.
            </p>
            <button
              onClick={snap}
              disabled={!ready}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-50"
            >
              <Camera className="h-4 w-4" /> Capture
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function BiometricsPanel({
  metrics,
  photoUrl,
  heatmap,
  onToggleHeatmap,
  onUpload,
  analyzing,
  error,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [cameraOpen, setCameraOpen] = useState(false);

  return (
    <section className="space-y-4" aria-labelledby="bio-title">
      <h2 id="bio-title" className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
        <Sparkles className="h-4 w-4 text-emerald-400" /> Your Skin Scan
      </h2>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
        <div className="relative mx-auto aspect-[4/5] w-full max-w-sm overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt="Uploaded selfie" className="h-full w-full object-cover" />
          ) : (
            <PhotoPlaceholder />
          )}
          {heatmap && metrics && <HeatOverlay metrics={metrics} />}
          {analyzing && (
            <div className="absolute inset-0 bg-slate-950/60">
              <div className="absolute inset-x-0 h-0.5 animate-scan bg-emerald-400 shadow-[0_0_14px_3px_rgba(16,185,129,0.8)]" />
              <div className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-emerald-300">
                <Loader2 className="h-4 w-4 animate-spin" /> YouCam Skin AI analysing...
              </div>
            </div>
          )}
          {heatmap && metrics && !analyzing && (
            <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-full bg-slate-950/80 px-2 py-1 text-[10px] text-slate-300">
              <span className="h-2 w-2 rounded-full bg-rose-500" /> Redness
              <span className="ml-1 h-2 w-2 rounded-full bg-amber-400" /> Texture &amp; Flaking
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(f);
              e.target.value = "";
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={analyzing}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-3.5 py-2 text-sm font-medium text-slate-950 transition hover:bg-emerald-400 disabled:opacity-50"
          >
            <Upload className="h-4 w-4" /> Upload photo
          </button>
          <button
            onClick={() => setCameraOpen(true)}
            disabled={analyzing}
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/50 px-3.5 py-2 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/10 disabled:opacity-50"
          >
            <Camera className="h-4 w-4" /> Take selfie
          </button>
          <button
            onClick={onToggleHeatmap}
            aria-pressed={heatmap}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm transition",
              heatmap
                ? "border-rose-500/50 bg-rose-500/10 text-rose-300"
                : "border-slate-700 text-slate-300 hover:bg-slate-800",
            )}
          >
            {heatmap ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            Heatmap {heatmap ? "on" : "off"}
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-rose-300">{error}</p>}
      </div>
      {cameraOpen && (
        <CameraModal
          onClose={() => setCameraOpen(false)}
          onCapture={(f) => {
            setCameraOpen(false);
            onUpload(f);
          }}
        />
      )}

      {metrics ? (
      <div className="grid gap-3">
        <MetricCard
          label="Redness & Irritation"
          hint="Lower is calmer."
          value={metrics.redness}
          higherIsWorse
          icon={Flame}
        />
        <MetricCard
          label="Skin Texture & Flaking"
          hint="Lower is smoother."
          value={metrics.roughness}
          higherIsWorse
          icon={Waves}
        />
        <MetricCard
          label="Moisture Level"
          hint="Higher is better hydrated."
          value={metrics.hydration}
          higherIsWorse={false}
          icon={Droplets}
        />
      </div>
      ) : (
        <p className="rounded-xl border border-dashed border-slate-700 p-4 text-center text-sm text-slate-400">
          Upload a clear front-facing photo or take a selfie to see your redness, texture and moisture readings.
        </p>
      )}

      <p className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-300/90">
        <Sparkles className="h-3.5 w-3.5 shrink-0" />
        Skin readings are generated by YouCam Skin AI from your photo.
      </p>
    </section>
  );
}
