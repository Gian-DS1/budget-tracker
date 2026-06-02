// Budget 1:1 — "Romer Budget & Spending Control" (Stitch). UI pura, datos demo.
import MS from '../MS';

export default function StitchBudget() {
  return (
    <div className="p-margin-safe overflow-y-auto w-full max-w-[1728px] mx-auto bg-surface-background">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-xl gap-lg">
        <div>
          <div className="flex items-center gap-sm mb-xs">
            <div className="w-1.5 h-1.5 rounded-full bg-secondary live-dot" />
            <span className="font-mono-data text-mono-data text-secondary uppercase">Active Module</span>
          </div>
          <h1 className="font-hero-headline text-headline-lg md:text-hero-headline text-on-background tracking-tighter">BUDGET CONTROL</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant mt-xs">
            Real-time spend telemetry and deviation analysis for current fiscal period.
          </p>
        </div>
        <div className="flex gap-md bg-surface-card p-sm rounded border border-border-subtle inner-glow">
          {[
            { l: 'PERIOD', v: 'OCT 2023', c: 'text-on-background' },
            { l: 'TOTAL LIMIT', v: '$12,500.00', c: 'text-on-background' },
            { l: 'STATUS', v: 'NOMINAL', c: 'text-secondary' },
          ].map((s, i) => (
            <div key={s.l} className={`flex flex-col px-md py-xs ${i < 2 ? 'border-r border-border-subtle' : ''}`}>
              <span className="font-mono-data text-mono-data text-text-muted">{s.l}</span>
              <span className={`font-label-sm text-label-sm mt-1 ${s.c}`}>{s.v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bento grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
        {/* Macro spend velocity (8 cols) */}
        <div className="md:col-span-8 bg-surface-panel border border-border-subtle rounded-lg inner-glow p-lg flex flex-col relative overflow-hidden">
          <div className="flex justify-between items-center mb-lg border-b border-border-subtle pb-sm">
            <h2 className="font-mono-data text-mono-data text-on-surface-variant">MACRO SPEND VELOCITY</h2>
            <MS name="timeline" className="text-text-muted text-[16px]" />
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <div className="flex justify-between items-end mb-xs">
              <div className="flex flex-col">
                <span className="font-mono-data text-mono-data text-text-muted">CURRENT SPEND</span>
                <span className="font-headline-md text-headline-md text-on-background tracking-tighter">$8,432.10</span>
              </div>
              <div className="flex flex-col text-right">
                <span className="font-mono-data text-mono-data text-text-muted">PROJECTED BURN</span>
                <span className="font-headline-md text-secondary tracking-tighter text-[24px]">$11,850.00</span>
              </div>
            </div>
            <div className="w-full h-1 bg-surface-container-highest mt-md relative">
              <div className="absolute top-0 left-0 h-full bg-primary" style={{ width: '67%' }} />
              <div className="absolute top-[-4px] w-0.5 h-3 bg-secondary" style={{ left: '94%' }} />
              <div className="absolute top-[-4px] right-0 w-0.5 h-3 bg-accent-error" />
            </div>
            <div className="flex justify-between mt-sm">
              <span className="font-mono-data text-mono-data text-text-muted">0%</span>
              <span className="font-mono-data text-mono-data text-primary">67% CONSUMED</span>
              <span className="font-mono-data text-mono-data text-text-muted">100%</span>
            </div>
          </div>
        </div>

        {/* Daily burn rate (4 cols) */}
        <div className="md:col-span-4 bg-surface-panel border border-border-subtle rounded-lg inner-glow p-lg flex flex-col">
          <div className="flex justify-between items-center mb-lg border-b border-border-subtle pb-sm">
            <h2 className="font-mono-data text-mono-data text-on-surface-variant">DAILY BURN RATE</h2>
            <MS name="local_fire_department" className="text-accent-warning text-[16px]" />
          </div>
          <div className="flex-1 flex flex-col justify-center items-center text-center">
            <span className="font-hero-headline text-[56px] text-on-background tracking-tighter leading-none">$281</span>
            <span className="font-mono-data text-mono-data text-text-muted mt-sm">AVG / DAY · 30D</span>
            <span className="font-label-sm text-label-sm text-tertiary mt-md flex items-center gap-xs">
              <MS name="trending_down" className="text-[14px]" /> 4.2% vs last period
            </span>
          </div>
        </div>

        {/* Category envelopes (12 cols) */}
        <div className="md:col-span-12 bg-surface-panel border border-border-subtle rounded-lg inner-glow p-lg">
          <div className="flex justify-between items-center mb-lg border-b border-border-subtle pb-sm">
            <h2 className="font-mono-data text-mono-data text-on-surface-variant">ENVELOPE ALLOCATION</h2>
            <MS name="category" className="text-text-muted text-[16px]" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md">
            {[
              { n: 'Housing', spent: '$3,200', lim: '$3,200', pct: 100, c: 'bg-accent-error' },
              { n: 'Food & Groceries', spent: '$840', lim: '$1,200', pct: 70, c: 'bg-accent-warning' },
              { n: 'Transport', spent: '$310', lim: '$600', pct: 52, c: 'bg-primary' },
              { n: 'Savings', spent: '$1,500', lim: '$1,500', pct: 100, c: 'bg-tertiary' },
            ].map((e) => (
              <div key={e.n} className="bg-surface-card border border-border-subtle rounded p-md inner-glow flex flex-col gap-sm">
                <span className="font-label-sm text-label-sm uppercase text-on-surface">{e.n}</span>
                <div className="font-headline-md text-[22px] text-on-background tracking-tight">{e.spent}</div>
                <span className="font-mono-data text-mono-data text-text-muted">of {e.lim}</span>
                <div className="w-full h-1 bg-surface-container-highest rounded-full overflow-hidden mt-xs">
                  <div className={`h-full ${e.c}`} style={{ width: `${e.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
