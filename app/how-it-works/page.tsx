import type { Metadata } from "next";
import Link from "next/link";
import HowItWorks from "@/components/landing/HowItWorks";
import PageShell from "@/components/PageShell";

export const metadata: Metadata = { title: "How It Works | DermShield" };

export default function HowItWorksPage() {
  return (
    <PageShell
      eyebrow="HOW IT WORKS"
      title="Three simple steps to calmer skin"
      intro="No guessing and no more serums that sting. Here is exactly what DermShield does for you."
    >
      <HowItWorks bare />
      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/scan"
          className="rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
        >
          Check my skin
        </Link>
        <Link
          href="/audit"
          className="rounded-full border border-slate-600 px-6 py-3 text-sm font-semibold transition hover:border-emerald-500 hover:text-emerald-300"
        >
          Audit my products
        </Link>
      </div>
    </PageShell>
  );
}
