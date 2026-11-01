import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/PageShell";

export const metadata: Metadata = {
  title: "Demo Video | DermShield",
  description: "A 3-minute walkthrough of DermShield: scan, audit your bottles with Gemini, and shop safe pharmacy essentials.",
};

const VIDEO = "/demo/DermShield-demo.mp4";

export default function DemoPage() {
  return (
    <PageShell
      eyebrow="DEMO VIDEO"
      title="See DermShield in under 3 minutes"
      intro="A real recording of the live app: a skin scan, a bottle label read by Gemini, and a Safe Store with live prices. Narrated, with captions."
    >
      <div className="mx-auto max-w-4xl">
        <video
          controls
          playsInline
          preload="metadata"
          poster="/demo/poster.jpg"
          className="aspect-video w-full rounded-2xl border border-slate-800 bg-black shadow-2xl"
          aria-label="DermShield demo video"
        >
          <source src={VIDEO} type="video/mp4" />
          Your browser can&apos;t play this video.{" "}
          <a href={VIDEO} className="underline">
            Download it instead
          </a>
          .
        </video>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            href="/"
            className="rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
          >
            Try the live app
          </Link>
          <a
            href={VIDEO}
            download
            className="rounded-full border border-slate-600 px-6 py-3 text-sm font-semibold transition hover:border-emerald-500 hover:text-emerald-300"
          >
            Download the video (9 MB)
          </a>
        </div>
      </div>
    </PageShell>
  );
}
