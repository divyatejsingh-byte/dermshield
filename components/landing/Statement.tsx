import FaceScan from "./FaceScan";

export default function Statement() {
  return (
    <section
      id="problem"
      className="relative flex min-h-screen items-center overflow-hidden px-6 py-24 md:px-16"
    >
      <div className="relative z-10 grid w-full grid-cols-[1.5fr_1fr] items-center gap-5 md:gap-14 md:grid-cols-[1.6fr_1fr]">
        <div className="max-w-5xl">
          <p className="mb-8 font-mono text-[11px] uppercase tracking-[0.22em] text-emerald-400">
            THE PROBLEM
          </p>
          <h2
            className="max-w-[22ch] font-display font-semibold leading-[1.1] tracking-tight"
            style={{ fontSize: "clamp(24px, 3.6vw, 52px)" }}
          >
            Most skin damage comes from mixing too many{" "}
            <span className="text-[#f59e0b]">strong products</span>. We help your skin rest and reset.
          </h2>
          <p className="mt-10 max-w-md text-base text-slate-400">
            No guessing. No wasting money on serums that make your face sting.
          </p>
        </div>

        <FaceScan />
      </div>
    </section>
  );
}
