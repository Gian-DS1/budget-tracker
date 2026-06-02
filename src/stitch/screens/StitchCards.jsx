// Cards & Debt 1:1 — "Romer Card & Debt Manager" (Stitch). UI pura, datos demo.
import MS from '../MS';

const CARDS = [
  { acc: 'Operating Account', last: '4920', bal: '$24,500.00', limit: 'Limit: $50K', tag: 'Active', dot: 'bg-tertiary', tagC: 'text-tertiary' },
  { acc: 'Travel & Expense', last: '8812', bal: '$3,240.50', limit: 'Limit: $10K', tag: 'Virtual', dot: 'bg-secondary', tagC: 'text-secondary' },
];

const DEBTS = [
  { name: 'Primary Mortgage', apr: '3.2% APR', aprC: 'text-text-muted', amt: '$420,000', amtC: 'text-on-surface', w: '65%', bar: 'bg-primary', paid: 'Paid: $280K', rem: 'Remaining: 15 YRS', warn: false },
  { name: 'Equipment Loan', apr: '8.5% APR', aprC: 'text-accent-warning', amt: '$45,000', amtC: 'text-accent-warning', w: '30%', bar: 'bg-accent-warning', paid: 'Paid: $15K', rem: 'Remaining: 3 YRS', warn: true },
];

export default function StitchCards() {
  return (
    <div className="p-margin-safe md:p-xl flex flex-col gap-[120px] w-full max-w-[1728px] mx-auto bg-surface-background">
      {/* Cards carousel */}
      <section className="flex flex-col gap-lg">
        <div className="flex justify-between items-end border-b border-border-subtle pb-sm">
          <h2 className="font-mono-data text-mono-data text-text-muted tracking-widest uppercase">Virtual & Physical Cards</h2>
          <div className="flex gap-sm">
            <button className="w-8 h-8 flex items-center justify-center rounded border border-border-subtle text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors inner-glow"><MS name="chevron_left" className="text-[18px]" /></button>
            <button className="w-8 h-8 flex items-center justify-center rounded border border-border-subtle text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors inner-glow"><MS name="chevron_right" className="text-[18px]" /></button>
          </div>
        </div>
        <div className="flex gap-lg overflow-x-auto pb-md snap-x hide-scrollbar">
          {CARDS.map((c) => (
            <div key={c.last} className="min-w-[320px] bg-surface-card rounded-xl p-lg border border-border-subtle inner-glow snap-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="flex justify-between items-start mb-xl relative z-10">
                <div className="flex items-center gap-sm">
                  <span className={`w-2 h-2 rounded-full glow-dot ${c.dot}`} />
                  <span className="font-label-sm text-label-sm uppercase text-[#e5e2e3]">{c.acc}</span>
                </div>
                <MS name="contactless" className="text-text-muted" />
              </div>
              <div className="font-mono-data text-mono-data text-text-muted mb-xs">**** **** **** {c.last}</div>
              <div className="font-headline-md text-headline-md text-[#e5e2e3] mb-lg">{c.bal}</div>
              <div className="flex justify-between items-center text-text-muted">
                <span className="font-label-sm text-label-sm">{c.limit}</span>
                <span className={`font-label-sm text-label-sm ${c.tagC}`}>{c.tag}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Debt architecture */}
      <section className="flex flex-col gap-lg">
        <div className="flex justify-between items-end border-b border-border-subtle pb-sm">
          <h2 className="font-mono-data text-mono-data text-text-muted tracking-widest uppercase">Debt Architecture</h2>
          <span className="font-label-sm text-label-sm text-accent-warning flex items-center gap-xs">
            <MS name="warning" className="text-[14px]" /> Review Recommended
          </span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-md">
          {DEBTS.map((d) => (
            <div key={d.name} className={`bg-surface-card border rounded-lg p-md inner-glow flex flex-col gap-md ${d.warn ? 'border-accent-warning/30' : 'border-border-subtle'}`}>
              <div className="flex justify-between items-center">
                <span className="font-label-sm text-label-sm uppercase text-[#e5e2e3]">{d.name}</span>
                <span className={`font-mono-data text-mono-data ${d.aprC}`}>{d.apr}</span>
              </div>
              <div className={`font-headline-md text-headline-md ${d.amtC}`}>{d.amt}</div>
              <div className="w-full bg-surface-container-highest h-1 rounded-full overflow-hidden mt-sm">
                <div className={`h-full rounded-full ${d.bar}`} style={{ width: d.w }} />
              </div>
              <div className="flex justify-between font-mono-data text-mono-data text-text-muted mt-xs">
                <span>{d.paid}</span><span>{d.rem}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
