"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** Drop a close-up face photo here to replace the illustration. */
const PHOTO_SRC = "/images/face-closeup.jpg";
/** Where the redness sits on the photo, as % of the frame (tune to the photo you use). */
const REDNESS_SPOTS = [
  { x: 42, y: 58, size: 34 },
  { x: 67, y: 54, size: 22 },
  { x: 52, y: 72, size: 15 },
];
const ZOOM_ORIGIN = "45% 58%";

/** Face with irritated cheeks. Hover (or tap) zooms in on the redness. */
export default function FaceScan() {
  const [zoom, setZoom] = useState(false);
  const [hasPhoto, setHasPhoto] = useState(false);

  useEffect(() => {
    const img = new window.Image();
    img.onload = () => setHasPhoto(true);
    img.src = PHOTO_SRC;
  }, []);

  return (
    <div
      className="group relative aspect-[4/5] w-full max-w-[300px] md:ml-auto cursor-zoom-in overflow-hidden rounded-3xl border border-emerald-500/30 bg-slate-950 shadow-[0_0_60px_-20px_rgba(16,185,129,0.4)]"
      onMouseEnter={() => setZoom(true)}
      onMouseLeave={() => setZoom(false)}
      onClick={() => setZoom((z) => !z)}
      role="img"
      aria-label="Illustration of a face with red, irritated cheeks. Hover or tap to zoom in on the redness."
    >
      <div
        className="absolute inset-0 transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ transform: zoom ? "scale(2.7)" : "scale(1)", transformOrigin: hasPhoto ? ZOOM_ORIGIN : "32% 60%" }}
      >
        {hasPhoto ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={PHOTO_SRC} alt="" className="h-full w-full object-cover" />
            {REDNESS_SPOTS.map((p, i) => (
              <div
                key={i}
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full mix-blend-multiply transition-opacity duration-700"
                style={{
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  width: `${p.size}%`,
                  aspectRatio: "1",
                  opacity: zoom ? 0.95 : 0.55,
                  background: "radial-gradient(circle, rgba(205,40,65,0.75) 0%, rgba(215,70,90,0.35) 50%, rgba(215,70,90,0) 72%)",
                  filter: "blur(6px)",
                }}
              />
            ))}
          </>
        ) : (
        <svg viewBox="0 0 400 500" className="h-full w-full" aria-hidden>
          <defs>
            <radialGradient id="fs-skin" cx="48%" cy="40%" r="62%">
              <stop offset="0%" stopColor="#f1c6ab" />
              <stop offset="65%" stopColor="#dba58a" />
              <stop offset="100%" stopColor="#b97f66" />
            </radialGradient>
            <radialGradient id="fs-bg" cx="50%" cy="35%" r="75%">
              <stop offset="0%" stopColor="#12304a" />
              <stop offset="100%" stopColor="#020617" />
            </radialGradient>
            <radialGradient id="fs-flush" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#d12c45" stopOpacity="0.75" />
              <stop offset="55%" stopColor="#d9475b" stopOpacity="0.38" />
              <stop offset="100%" stopColor="#d9475b" stopOpacity="0" />
            </radialGradient>
            <filter id="fs-soft" x="-30%" y="-30%" width="160%" height="160%">
              <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="3" seed="4" result="n" />
              <feDisplacementMap in="SourceGraphic" in2="n" scale="22" />
              <feGaussianBlur stdDeviation="3" />
            </filter>
            <filter id="fs-pores" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
              <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="9" />
              <feColorMatrix type="matrix" values="0 0 0 0 0.35  0 0 0 0 0.17  0 0 0 0 0.12  0 0 0 -16 8.2" />
            </filter>
            <clipPath id="fs-face">
              <ellipse cx="200" cy="228" rx="112" ry="146" />
            </clipPath>
          </defs>

          <rect width="400" height="500" fill="url(#fs-bg)" />
          {/* shoulders + neck */}
          <path d="M40 500c6-84 70-118 160-118s154 34 160 118z" fill="#1e293b" />
          <rect x="164" y="340" width="72" height="70" rx="22" fill="#c48f76" />
          {/* hair back */}
          <path d="M82 232c-14-108 44-168 118-168s132 60 118 168c-6-70-36-112-118-112S88 162 82 232z" fill="#2a1b15" />
          {/* ears */}
          <ellipse cx="88" cy="236" rx="13" ry="26" fill="#cf9a80" />
          <ellipse cx="312" cy="236" rx="13" ry="26" fill="#cf9a80" />
          {/* face */}
          <ellipse cx="200" cy="228" rx="112" ry="146" fill="url(#fs-skin)" />

          <g clipPath="url(#fs-face)">
            {/* texture only reads once you zoom in */}
            <rect
              width="400"
              height="500"
              filter="url(#fs-pores)"
              className="transition-opacity duration-700"
              opacity={zoom ? 0.16 : 0.04}
            />
            {/* irritated patches on both cheeks, nose and chin */}
            <g filter="url(#fs-soft)" className="transition-opacity duration-700" opacity={zoom ? 1 : 0.75}>
              <circle cx="132" cy="262" r="62" fill="url(#fs-flush)" />
              <circle cx="268" cy="262" r="58" fill="url(#fs-flush)" />
              <circle cx="200" cy="244" r="30" fill="url(#fs-flush)" />
              <circle cx="116" cy="300" r="28" fill="url(#fs-flush)" />
              <circle cx="200" cy="340" r="26" fill="url(#fs-flush)" />
            </g>
            {/* small inflamed spots */}
            <g fill="#c2263f" opacity={zoom ? 0.6 : 0.35} className="transition-opacity duration-700">
              <circle cx="120" cy="256" r="3.2" />
              <circle cx="146" cy="276" r="2.6" />
              <circle cx="132" cy="236" r="2.2" />
              <circle cx="258" cy="270" r="3" />
              <circle cx="276" cy="246" r="2.4" />
            </g>
          </g>

          {/* hair front */}
          <path d="M92 214c2-76 44-108 108-108s106 32 108 108c-14-42-52-66-108-66s-94 24-108 66z" fill="#2a1b15" />
          {/* brows, eyes, nose, mouth */}
          <path d="M132 196q22-12 44-2M224 194q22-10 44 2" stroke="#3b2a22" strokeWidth="5" strokeLinecap="round" fill="none" />
          <ellipse cx="154" cy="216" rx="15" ry="6.5" fill="#fff" opacity="0.92" />
          <ellipse cx="246" cy="216" rx="15" ry="6.5" fill="#fff" opacity="0.92" />
          <circle cx="154" cy="216" r="5.2" fill="#4a3226" />
          <circle cx="246" cy="216" r="5.2" fill="#4a3226" />
          <path d="M200 226v46c-8 6-14 6-20 2M200 272c4 4 12 4 18 0" stroke="#b27760" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M166 316c18 12 50 12 68 0" stroke="#a0524a" strokeWidth="5" fill="none" strokeLinecap="round" />
        </svg>
        )}
      </div>

      {/* scanner overlay: fixed, does not zoom */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-3 top-3 h-5 w-5 border-l-2 border-t-2 border-emerald-400/70" />
        <div className="absolute right-3 top-3 h-5 w-5 border-r-2 border-t-2 border-emerald-400/70" />
        <div className="absolute bottom-3 left-3 h-5 w-5 border-b-2 border-l-2 border-emerald-400/70" />
        <div className="absolute bottom-3 right-3 h-5 w-5 border-b-2 border-r-2 border-emerald-400/70" />
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-slate-950/90 to-transparent px-3 pb-3 pt-8 font-mono text-[10px] uppercase tracking-[0.12em] md:px-5 md:pb-4 md:text-[11px] md:tracking-[0.16em] transition-colors duration-500",
            zoom ? "text-rose-300" : "text-slate-400",
          )}
        >
          <span className="flex items-center gap-2">
            <span className={cn("h-1.5 w-1.5 rounded-full", zoom ? "animate-pulse bg-rose-400" : "bg-emerald-400")} />
            {zoom ? "Redness detected" : "Skin scan ready"}
          </span>
        </div>
      </div>
    </div>
  );
}
