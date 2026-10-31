"use client";

import CommerceSection from "../CommerceSection";
import PageShell from "../PageShell";
import { useApp } from "../AppProvider";

export default function StoreView() {
  const a = useApp();
  return (
    <PageShell
      eyebrow="SAFE STORE"
      title="Gentle care, with live prices"
      intro="Products unlock in two steps as your skin heals: soothing care at a Skin Shield Score of 50, everything at 75."
    >
      <CommerceSection commerce={a.commerce} score={a.suggestScore ?? 0} scanned={a.suggestScore !== null} />
    </PageShell>
  );
}
