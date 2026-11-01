"use client";

import { FlaskConical } from "lucide-react";
import { useSkin } from "@/context/SkinContext";

/** Makes it obvious the sample bottles come from the demo scenario, not from a photo. */
export default function DemoBanner({ className = "" }: { className?: string }) {
  const { demoProfile } = useSkin();
  if (!demoProfile) return null;
  return (
    <p
      role="status"
      className={`flex items-start gap-2.5 rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-200 ${className}`}
    >
      <FlaskConical className="mt-0.5 h-4 w-4 shrink-0" />
      <span>
        <strong className="font-semibold">Demo Mode Active:</strong> Pre-loaded with a simulated retinol + chemical
        exfoliant burn profile.
        <span className="mt-0.5 block text-xs text-amber-200/80">
          Upload a photo or take a selfie to replace it with your own results.
        </span>
      </span>
    </p>
  );
}
