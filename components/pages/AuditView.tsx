"use client";

import PageShell from "../PageShell";
import RosterLedger from "../landing/RosterLedger";
import ShelfAuditor from "../ShelfAuditor";
import { useApp } from "../AppProvider";

export default function AuditView() {
  const a = useApp();
  return (
    <>
      <div className="pt-14 md:pt-16">
        <RosterLedger shelf={a.shelf} shield={a.shield} metrics={a.metrics} onAdd={a.addProduct} />
      </div>
      <PageShell eyebrow="MANAGE YOUR PRODUCTS" title="Your routine, checked">
        <div id="manage-products" className="max-w-3xl scroll-mt-24">
          <ShelfAuditor
            shelf={a.shelf}
            shield={a.shield}
            metrics={a.metrics}
            day={a.day}
            onToggle={a.toggleProduct}
            onAdd={a.addProduct}
            onRemove={a.removeProduct}
          />
        </div>
      </PageShell>
    </>
  );
}
