// Dashboard 1:1 — "Romer Command Center" (Stitch). UI pura, datos demo.
import MS from '../MS';

export default function StitchDashboard() {
  return (
    <div className="p-margin-safe flex gap-gutter max-w-[1728px] mx-auto w-full">
      {/* Columna principal */}
      <div className="flex flex-col gap-gutter flex-grow">
        {/* Hero: Cash Flow Engine */}
        <section className="glass-card rounded-lg p-lg relative overflow-hidden flex flex-col h-[400px]">
          <div className="flex justify-between items-start mb-md z-10">
            <div>
              <h2 className="font-headline-md text-headline-md text-on-surface mb-xs">Cash Flow Engine</h2>
              <p className="font-mono-data text-mono-data text-text-muted">REAL-TIME TELEMETRY // T-30 DAYS</p>
            </div>
            <div className="flex items-center gap-sm">
              <span className="w-2 h-2 rounded-full bg-secondary status-glow-live" />
              <span className="font-mono-data text-mono-data text-secondary uppercase">Live Sync</span>
            </div>
          </div>
          <div className="flex-grow relative mt-lg chart-grid border-l border-b border-border-subtle">
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(180deg, rgba(190,194,255,0.15) 0%, rgba(190,194,255,0) 100%)',
                clipPath:
                  'polygon(0 40%,10% 35%,20% 50%,30% 20%,40% 45%,50% 10%,60% 30%,70% 15%,80% 40%,90% 5%,100% 25%,100% 100%,0 100%)',
              }}
            />
            <div className="absolute left-[-40px] top-0 bottom-0 flex flex-col justify-between font-mono-data text-[10px] text-text-muted py-sm">
              <span>$50K</span><span>$25K</span><span>$0</span>
            </div>
          </div>
        </section>

        {/* Metrics grid */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-sm">
          {[
            { l: 'TOTAL ASSETS', v: '$1,402,890', d: '+2.4% / mo', up: true, c: 'text-tertiary' },
            { l: 'CURRENT LIABILITIES', v: '$42,150', d: '-1.2% / mo', c: 'text-on-surface-variant' },
            { l: 'SAVINGS RATE', v: '34.2%', d: '+0.8%', up: true, c: 'text-tertiary' },
            { l: 'BURN VELOCITY', v: '$12K/mo', d: 'High', warn: true, c: 'text-accent-error' },
          ].map((m) => (
            <div key={m.l} className="glass-card rounded p-md flex flex-col gap-sm">
              <div className="font-mono-data text-mono-data text-text-muted border-b border-border-subtle pb-xs">{m.l}</div>
              <div className="font-headline-md text-headline-md text-on-surface">{m.v}</div>
              <div className={`font-label-sm text-label-sm flex items-center gap-xs ${m.c}`}>
                {m.up && <MS name="arrow_upward" className="text-[14px]" />}
                {m.warn && <MS name="warning" className="text-[14px]" />}
                {m.d}
              </div>
            </div>
          ))}
        </section>
      </div>

      {/* Right rail: Recent Signals */}
      <aside className="w-[320px] shrink-0 glass-panel rounded-lg p-md flex flex-col border border-border-subtle">
        <div className="font-mono-data text-mono-data text-on-surface border-b border-border-subtle pb-sm mb-md flex justify-between items-center">
          <span>RECENT SIGNALS</span>
          <MS name="radar" className="text-[14px] text-text-muted" />
        </div>
        <div className="flex flex-col gap-sm overflow-y-auto">
          {[
            { tag: 'Anomalous Spend', tc: 'text-accent-error', t: '2H AGO', body: 'AWS Web Services ($420.00) exceeded typical monthly threshold.', cta: 'REVIEW' },
            { tag: 'Vault Milestone', tc: 'text-tertiary', t: '1D AGO', body: "'Tax Reserve 2024' reached 80% funding target.", cta: 'VIEW VAULT' },
            { tag: 'Upcoming Bill', tc: 'text-secondary', t: 'IN 3D', body: 'Property Tax Q3 ($3,400.00) auto-debit scheduled.' },
          ].map((s, i) => (
            <div key={i} className="group p-sm border border-transparent hover:border-border-subtle hover:bg-surface-container-high transition-all rounded flex flex-col gap-xs cursor-pointer">
              <div className="flex justify-between items-center">
                <span className={`font-label-sm text-label-sm ${s.tc}`}>{s.tag}</span>
                <span className="font-mono-data text-mono-data text-text-muted">{s.t}</span>
              </div>
              <div className="font-body-md text-body-md text-on-surface-variant group-hover:text-on-surface">{s.body}</div>
              {s.cta && (
                <button className="mt-xs py-xs px-sm border border-border-subtle text-primary font-mono-data text-mono-data rounded self-start hover:bg-primary/10">
                  {s.cta}
                </button>
              )}
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
