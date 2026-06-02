// Vaults 1:1 — "Romer Savings Vaults" (Stitch). UI pura, datos demo.
import MS from '../MS';

const VAULTS = [
  { icon: 'home_work', name: 'Real Estate', amount: '$45,200', cents: '.00', target: 'Target: $120,000', pct: '37.6%', w: '37.6%', eta: 'Oct 2026', flow: '+$1,200/mo' },
  { icon: 'directions_car', name: 'New Vehicle', amount: '$18,900', cents: '.00', target: 'Target: $35,000', pct: '54.0%', w: '54%', eta: 'Mar 2026', flow: '+$800/mo' },
  { icon: 'health_and_safety', name: 'Emergency', amount: '$30,000', cents: '.00', target: 'Target: $30,000', pct: '100%', w: '100%', eta: 'Funded', flow: 'Secured' },
];

export default function StitchVaults() {
  return (
    <div className="p-margin-safe pb-section-padding max-w-[1728px] mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-lg mb-xl">
        <div>
          <div className="flex items-center gap-2 mb-sm">
            <span className="w-2 h-2 rounded-full bg-tertiary live-dot" />
            <span className="font-mono-data text-mono-data text-tertiary uppercase tracking-wider">Active System</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Savings Vaults</h1>
          <p className="font-body-md text-body-md text-text-muted mt-2 max-w-2xl">
            Manage goal-based liquidity and automated allocation strategies.
          </p>
        </div>
        <div className="glass-panel p-md rounded-lg border border-border-subtle inner-glow flex items-center gap-lg">
          <div className="flex flex-col">
            <span className="font-mono-data text-mono-data text-text-muted mb-xs">AUTO-ALLOCATION</span>
            <div className="flex items-center gap-2">
              <span className="font-headline-md text-headline-md text-on-surface">15%</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">/ deposit</span>
            </div>
          </div>
          <div className="h-8 w-px bg-border-subtle" />
          <button className="flex items-center gap-2 bg-transparent border border-border-subtle text-primary font-label-sm text-label-sm py-sm px-md rounded hover:bg-surface-container-high transition-colors">
            <MS name="tune" className="text-[16px]" /> Configure Flow
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-md">
        {VAULTS.map((v) => (
          <div key={v.name} className="bg-surface-card border border-border-subtle rounded-lg p-lg inner-glow relative overflow-hidden group hover:border-primary transition-colors">
            <div className="absolute top-0 right-0 p-md opacity-20 group-hover:opacity-100 transition-opacity">
              <button className="text-text-muted hover:text-on-surface"><MS name="more_horiz" /></button>
            </div>
            <div className="flex items-center gap-sm mb-lg">
              <div className="w-8 h-8 rounded-sm bg-surface-container-high flex items-center justify-center border border-border-subtle">
                <MS name={v.icon} className="text-[18px] text-tertiary" />
              </div>
              <span className="font-mono-data text-mono-data text-on-surface uppercase">{v.name}</span>
            </div>
            <div className="mb-xl">
              <div className="font-headline-md text-headline-md text-on-surface tracking-tight">
                {v.amount}<span className="text-text-muted text-[20px]">{v.cents}</span>
              </div>
              <div className="font-label-sm text-label-sm text-text-muted mt-xs flex justify-between">
                <span>{v.target}</span><span>{v.pct}</span>
              </div>
            </div>
            <div className="w-full h-[1px] bg-surface-container-highest mb-sm">
              <div className="h-full bg-tertiary relative" style={{ width: v.w }}>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-[3px] bg-tertiary rounded-full live-dot" />
              </div>
            </div>
            <div className="flex justify-between items-center mt-lg border-t border-border-subtle pt-md">
              <div className="flex flex-col">
                <span className="font-mono-data text-mono-data text-text-muted mb-xs">PROJECTED ETA</span>
                <span className="font-label-sm text-label-sm text-on-surface">{v.eta}</span>
              </div>
              <div className="flex flex-col text-right">
                <span className="font-mono-data text-mono-data text-text-muted mb-xs">FLOW RATE</span>
                <span className="font-label-sm text-label-sm text-tertiary">{v.flow}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
