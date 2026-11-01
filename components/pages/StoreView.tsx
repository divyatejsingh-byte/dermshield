"use client";

import CommerceSection from "../CommerceSection";
import PageShell from "../PageShell";
import PageSkeleton from "../PageSkeleton";
import { useSkin } from "@/context/SkinContext";

export default function StoreView() {
  const s = useSkin();
  if (!s.hydrated) return <PageSkeleton />;

  return (
    <PageShell
      eyebrow="SAFE STORE"
      title="Gentle care, with live prices"
      intro="Products unlock in two steps as your skin heals: soothing care at a Skin Shield Score of 50, everything at 75. While redness is above 40, only gentle essentials stay open."
    >
      <CommerceSection
        commerce={s.commerce}
        score={s.suggestScore ?? 0}
        scanned={s.suggestScore !== null}
        redness={s.metrics.isScanned ? s.metrics.redness : null}
      />
    </PageShell>
  );
}
