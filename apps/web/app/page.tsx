export default function Home() {
  return (
    <main className="mx-auto max-w-content px-6 py-14">
      <section className="border border-dashed border-ink p-6">
        <h1 className="text-[26px] font-bold tracking-[-0.5px]">alphaBeta</h1>
        <p className="text-ink-soft mt-2">
          Pre-build. The product is the discipline layer.
        </p>

        <ul className="mt-6 space-y-1 text-[11.5px] text-ink-soft uppercase tracking-[1px]">
          <li>Layer 1 — Strategy</li>
          <li>Layer 2 — Planning</li>
          <li>Layer 3 — Refinement</li>
          <li>Layer 4 — In-flight → Resolution</li>
          <li>Layer 5 — KM</li>
        </ul>

        <div className="mt-8 flex gap-2 text-[10.5px] uppercase tracking-[1px]">
          <span className="border border-dashed border-terra px-2 py-1 text-terra">terra</span>
          <span className="border border-dashed border-green px-2 py-1 text-green">green</span>
          <span className="border border-dashed border-amber px-2 py-1 text-amber">amber</span>
          <span className="border border-dashed border-plinth px-2 py-1 text-plinth">plinth</span>
        </div>

        <p className="mt-8 inline-block -rotate-1 font-display text-[17px] text-terra">
          — caveat: this is the marginalia register
        </p>
      </section>
    </main>
  );
}
