// Strategy 1:1 — "Romer Strategy & Planning" (Stitch). UI pura, datos demo.
import MS from '../MS';

export default function StitchStrategy() {
  return (
    <div className="flex flex-col w-full">
      {/* Context header */}
      <div className="px-md md:px-margin-safe py-lg border-b border-border-subtle bg-surface-background/95 backdrop-blur-sm sticky top-0 z-30">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-md max-w-[1728px] mx-auto w-full">
          <div>
            <div className="flex items-center gap-sm mb-xs">
              <span className="font-mono-data text-mono-data text-secondary">SYS.STRAT.01</span>
              <span className="w-1 h-1 rounded-full bg-border-subtle" />
              <span className="font-mono-data text-mono-data text-on-surface-variant">LONG-TERM HORIZON</span>
            </div>
            <h1 className="font-headline-md text-headline-md text-on-surface tracking-tight">Financial Strategy &amp; Outlook</h1>
          </div>
          <div className="flex gap-sm">
            <button className="flex items-center gap-xs px-sm py-xs border border-border-subtle rounded text-on-surface bg-surface hover:bg-surface-container transition-colors">
              <MS name="download" className="text-[16px]" /><span className="font-mono-data text-mono-data">EXPORT DATA</span>
            </button>
            <button className="flex items-center gap-xs px-sm py-xs border border-border-subtle rounded text-on-surface bg-surface-container-high hover:bg-surface-variant transition-colors font-bold">
              <MS name="save" className="text-[16px]" /><span className="font-mono-data text-mono-data">COMMIT SCENARIO</span>
            </button>
          </div>
        </div>
      </div>

      <div className="p-md md:p-margin-safe grid grid-cols-1 lg:grid-cols-12 gap-sm lg:gap-md items-start max-w-[1728px] mx-auto w-full">
        {/* Projection stage (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-sm">
          <div className="grid grid-cols-3 gap-[1px] bg-border-subtle rounded overflow-hidden border border-border-subtle">
            {[
              { l: 'CURRENT NW (T=0)', v: '$1,245,000', c: 'text-on-surface' },
              { l: 'PROJECTED NW (T+30)', v: '$8,920,450', c: 'text-secondary' },
              { l: 'CAGR (EXPECTED)', v: '6.8%', c: 'text-on-surface', trend: true },
            ].map((k) => (
              <div key={k.l} className="bg-surface-card p-md flex flex-col justify-center">
                <span className="font-mono-data text-mono-data text-on-surface-variant mb-sm">{k.l}</span>
                <div className={`font-headline-md text-headline-md ${k.c}`}>
                  {k.v}{k.trend && <MS name="trending_up" className="text-secondary text-[24px] align-middle ml-1" />}
                </div>
              </div>
            ))}
          </div>
          <div className="bg-surface-card border border-border-subtle rounded flex flex-col h-[480px] relative">
            <div className="p-md border-b border-border-subtle flex justify-between items-center">
              <h3 className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface">Wealth Trajectory / 30YR</h3>
              <div className="flex gap-sm">
                <span className="flex items-center gap-xs font-mono-data text-mono-data text-on-surface-variant"><div className="w-2 h-2 bg-secondary rounded-full" /> Baseline</span>
                <span className="flex items-center gap-xs font-mono-data text-mono-data text-on-surface-variant"><div className="w-2 h-2 bg-tertiary rounded-full" /> Aggressive</span>
              </div>
            </div>
            <div className="flex-1 relative chart-grid m-md border-l border-b border-border-subtle">
              <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(80,216,233,0.15) 0%, rgba(80,216,233,0) 100%)', clipPath: 'polygon(0 90%,20% 82%,40% 68%,60% 48%,80% 28%,100% 8%,100% 100%,0 100%)' }} />
            </div>
          </div>
        </div>

        {/* Scenario controls (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-sm">
          <div className="bg-surface-card border border-border-subtle rounded inner-glow p-md">
            <h3 className="font-mono-data text-mono-data text-on-surface-variant border-b border-border-subtle pb-sm mb-md">SCENARIO INPUTS</h3>
            {[
              { l: 'Monthly Contribution', v: '$4,500' },
              { l: 'Expected Return', v: '6.8%' },
              { l: 'Inflation', v: '3.0%' },
              { l: 'Horizon', v: '30 YRS' },
            ].map((r) => (
              <div key={r.l} className="flex justify-between items-center py-sm border-b border-border-subtle last:border-0">
                <span className="font-label-sm text-label-sm text-on-surface-variant">{r.l}</span>
                <span className="font-mono-data text-mono-data text-on-surface">{r.v}</span>
              </div>
            ))}
          </div>
          <div className="bg-surface-card border border-border-subtle rounded inner-glow p-md flex flex-col gap-sm">
            <span className="font-mono-data text-mono-data text-text-muted">MILESTONE</span>
            <span className="font-headline-md text-[22px] text-on-surface tracking-tight">First $1M</span>
            <span className="font-label-sm text-label-sm text-tertiary">Achieved · 2024</span>
          </div>
        </div>
      </div>
    </div>
  );
}
