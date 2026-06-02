// Reports 1:1 — "Romer Intelligence Reports" (Stitch). UI pura, datos demo.
import MS from '../MS';

export default function StitchReports() {
  return (
    <div className="max-w-[1728px] mx-auto p-margin-safe lg:p-xl space-y-xl w-full">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-lg border-b border-border-subtle pb-lg">
        <div>
          <div className="flex items-center gap-sm mb-md">
            <span className="bg-surface-container-highest px-sm py-xs rounded font-mono-data text-mono-data text-primary uppercase border border-border-subtle">Report: FY24-Q3</span>
            <span className="flex items-center gap-xs font-mono-data text-mono-data text-tertiary uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary status-glow-live" /> Generated
            </span>
          </div>
          <h1 className="font-hero-headline text-headline-lg md:text-[56px] text-on-background tracking-tighter leading-none">Intelligence Reports</h1>
          <p className="font-body-md text-body-md text-text-muted mt-sm max-w-2xl">Cross-sectional financial analysis, anomaly detection and trend forecasting.</p>
        </div>
        <div className="flex gap-sm">
          <button className="bg-transparent border border-border-subtle text-on-surface font-label-sm text-label-sm uppercase tracking-widest px-md py-sm rounded hover:bg-surface-container-high transition-colors flex items-center gap-xs inner-glow">
            <MS name="download" className="text-[16px]" /> Export PDF
          </button>
          <button className="bg-primary text-on-primary font-label-sm text-label-sm uppercase tracking-widest px-md py-sm rounded hover:bg-primary-container transition-colors inner-glow">
            New Analysis
          </button>
        </div>
      </header>

      {/* KPI strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-md">
        {[
          { l: 'NET WORTH', v: '$1.36M', d: '+8.2% QoQ', c: 'text-tertiary', icon: 'trending_up' },
          { l: 'SAVINGS RATE', v: '34.2%', d: 'Above target', c: 'text-tertiary', icon: 'savings' },
          { l: 'EXPENSE RATIO', v: '58%', d: 'Watch', c: 'text-accent-warning', icon: 'pie_chart' },
          { l: 'ANOMALIES', v: '3', d: 'Flagged', c: 'text-accent-error', icon: 'warning' },
        ].map((k) => (
          <div key={k.l} className="bg-surface-panel border border-border-subtle rounded-lg inner-glow p-lg flex flex-col gap-sm">
            <div className="flex justify-between items-start">
              <span className="font-mono-data text-mono-data text-text-muted">{k.l}</span>
              <MS name={k.icon} className={`text-[16px] ${k.c}`} />
            </div>
            <span className="font-headline-md text-headline-md text-on-background tracking-tighter">{k.v}</span>
            <span className={`font-label-sm text-label-sm ${k.c}`}>{k.d}</span>
          </div>
        ))}
      </section>

      {/* Trend + breakdown */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
        <div className="lg:col-span-2 bg-surface-panel border border-border-subtle rounded-lg inner-glow p-lg">
          <div className="flex justify-between items-center mb-lg border-b border-border-subtle pb-sm">
            <h2 className="font-mono-data text-mono-data text-on-surface-variant">NET WORTH TRAJECTORY // 12M</h2>
            <MS name="show_chart" className="text-text-muted text-[16px]" />
          </div>
          <div className="h-64 relative chart-grid border-l border-b border-border-subtle">
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(189,210,0,0.15) 0%, rgba(189,210,0,0) 100%)', clipPath: 'polygon(0 80%,15% 70%,30% 72%,45% 55%,60% 50%,75% 35%,100% 20%,100% 100%,0 100%)' }} />
          </div>
        </div>
        <div className="bg-surface-panel border border-border-subtle rounded-lg inner-glow p-lg">
          <div className="flex justify-between items-center mb-lg border-b border-border-subtle pb-sm">
            <h2 className="font-mono-data text-mono-data text-on-surface-variant">CATEGORY BREAKDOWN</h2>
            <MS name="donut_small" className="text-text-muted text-[16px]" />
          </div>
          <div className="flex flex-col gap-md">
            {[
              { n: 'Housing', pct: '32%', w: '32%', c: 'bg-primary' },
              { n: 'Food', pct: '21%', w: '21%', c: 'bg-secondary' },
              { n: 'Transport', pct: '14%', w: '14%', c: 'bg-tertiary' },
              { n: 'Other', pct: '33%', w: '33%', c: 'bg-accent-warning' },
            ].map((r) => (
              <div key={r.n} className="flex flex-col gap-xs">
                <div className="flex justify-between font-label-sm text-label-sm text-on-surface">
                  <span>{r.n}</span><span className="font-mono-data text-text-muted">{r.pct}</span>
                </div>
                <div className="w-full h-1 bg-surface-container-highest rounded-full overflow-hidden">
                  <div className={`h-full ${r.c}`} style={{ width: r.w }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
