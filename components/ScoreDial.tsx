"use client";

import { STAGE_META } from "@/lib/shieldEngine";
import { useAnimatedNumber } from "@/lib/useAnimatedNumber";
import { cn } from "@/lib/utils";
import type { Stage } from "@/types/dermshield";
import { TONE } from "./tone";

interface Props {
  score: number;
  stage: Stage;
  size?: number;
  className?: string;
}

export default function ScoreDial({ score, stage, size = 64, className }: Props) {
  const shown = useAnimatedNumber(score, 800);
  const tone = TONE[STAGE_META[stage].tone];
  const stroke = Math.max(4, size / 11);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Skin Shield Score ${Math.round(score)} out of 100`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1e293b" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tone.stroke}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - shown / 100)}
          style={{ transition: "stroke 0.5s" }}
        />
      </svg>
      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center font-semibold tabular-nums",
          tone.text,
        )}
        style={{ fontSize: size * 0.34 }}
      >
        {Math.round(shown)}
      </span>
    </div>
  );
}
