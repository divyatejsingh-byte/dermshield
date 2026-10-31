import Link from "next/link";

const LINKS = [
  { href: "/how-it-works", label: "How It Works" },
  { href: "/audit", label: "Audit Products" },
  { href: "/track", label: "Track Healing" },
  { href: "/store", label: "Safe Store" },
  { href: "/scan", label: "Check My Skin" },
];

/** Shared footer, rendered by the root layout on every page. */
export default function Footer() {
  return (
    <footer className="border-t border-slate-800 px-5 py-8 md:px-16">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <Link href="/" className="font-display text-lg font-bold tracking-tight">
            DermShield<span className="text-emerald-500">.</span>
          </Link>
          <p className="mt-1 text-xs text-slate-500">Smart skin protection powered by YouCam Skin AI.</p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-400">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="transition hover:text-emerald-400">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
      <p className="mt-6 text-[11px] text-slate-500">
        © {new Date().getFullYear()} DermShield · Not medical advice. If your skin is badly irritated, see a doctor.
      </p>
    </footer>
  );
}
