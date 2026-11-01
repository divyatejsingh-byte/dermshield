"use client";

import PageShell from "../PageShell";
import PageSkeleton from "../PageSkeleton";
import RosterLedger from "../landing/RosterLedger";
import ShelfAuditor from "../ShelfAuditor";
import { useSkin } from "@/context/SkinContext";

export default function AuditView() {
  const s = useSkin();
  if (!s.hydrated) return <PageSkeleton />;

  const add = (name: string, active: string, category?: Parameters<typeof s.addProductToAudit>[0]["category"]) =>
    s.addProductToAudit({ name, active, category });

  return (
    <>
      <div className="pt-14 md:pt-16">
        <RosterLedger
          shelf={s.shelf}
          shield={s.shield}
          metrics={s.readings}
          onAdd={add}
          onLoadDemo={s.loadDemoProfile}
        />
      </div>
      <PageShell eyebrow="MANAGE YOUR PRODUCTS" title="Your routine, checked">
        <div id="manage-products" className="max-w-3xl scroll-mt-24">
          <ShelfAuditor
            shelf={s.shelf}
            shield={s.shield}
            metrics={s.readings}
            day={s.day}
            onToggle={s.toggleProduct}
            onAdd={add}
            onRemove={s.removeProductFromAudit}
          />
        </div>
      </PageShell>
    </>
  );
}
