// Ledger 1:1 — "Romer Transactions Ledger" (Stitch). UI pura, datos demo.
import MS from '../MS';

const ROWS = [
  { sts: 'check_circle', stsC: 'text-tertiary-fixed', date: 'Oct 24, 2024', time: '14:02:11 UTC', m: 'AWS Cloud Services', tag: 'Infrastructure', tagC: 'text-on-surface-variant', acc: 'OPR-4921', amt: '-$12,450.00', amtC: 'text-on-surface', bal: '$1,452,190.22' },
  { sts: 'check_circle', stsC: 'text-tertiary-fixed', date: 'Oct 23, 2024', time: '09:15:00 UTC', m: 'Stripe Payout', tag: 'Revenue', tagC: 'text-tertiary', acc: 'OPR-4921', amt: '+$45,210.50', amtC: 'text-tertiary', bal: '$1,464,640.22' },
  { sts: 'pending', stsC: 'text-accent-warning', date: 'Oct 23, 2024', time: '16:44:22 UTC', m: 'Gusto Payroll', tag: 'Payroll', tagC: 'text-on-surface-variant', acc: 'OPR-4921', amt: '-$89,400.00', amtC: 'text-on-surface', bal: '--' },
];

export default function StitchLedger() {
  return (
    <div className="p-margin-safe max-w-[1728px] mx-auto w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-xl gap-md">
        <div>
          <h2 className="font-headline-lg text-headline-lg font-bold text-on-surface">Ledger</h2>
          <p className="font-mono-data text-mono-data text-text-muted mt-sm uppercase">
            14,204 Transactions · Live Sync Active
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary ml-xs status-glow-live align-middle" />
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-sm">
          <button className="bg-transparent border border-border-subtle text-primary font-label-sm text-label-sm px-md py-sm rounded hover:bg-surface-container-highest transition-colors flex items-center gap-xs inner-glow">
            <MS name="filter_list" className="text-[16px]" /> Filter
          </button>
          <button className="bg-transparent border border-border-subtle text-on-surface font-label-sm text-label-sm px-md py-sm rounded hover:bg-surface-container-highest transition-colors flex items-center gap-xs inner-glow">
            <MS name="download" className="text-[16px]" /> Export
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-surface-container-lowest border border-border-subtle rounded-lg p-sm mb-lg flex flex-wrap gap-sm items-center inner-glow">
        {['All Time', 'All Categories', 'All Accounts'].map((label) => (
          <div key={label} className="relative">
            <select className="appearance-none bg-surface-container border border-border-subtle text-on-surface font-label-sm text-label-sm py-xs pl-sm pr-[28px] rounded hover:border-outline-variant focus:outline-none focus:border-primary transition-colors cursor-pointer inner-glow">
              <option>{label}</option>
            </select>
            <MS name="expand_more" className="absolute right-xs top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[16px]" />
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div className="bg-surface-container-lowest border border-border-subtle rounded-lg overflow-x-auto inner-glow relative">
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '16px 16px' }} />
        <table className="w-full text-left border-collapse relative z-10">
          <thead>
            <tr className="border-b border-border-subtle">
              {['STS', 'Date & Time', 'Merchant / Entity', 'Account', 'Amount', 'Balance'].map((h, i) => (
                <th key={h} className={`py-sm px-md font-mono-data text-mono-data text-text-muted uppercase font-normal ${i === 0 ? 'w-12 text-center' : ''} ${i >= 4 ? 'text-right' : ''}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="font-body-md text-body-md">
            {ROWS.map((r, i) => (
              <tr key={i} className="border-b border-border-subtle hover:bg-surface-container-high transition-colors group cursor-pointer">
                <td className="py-sm px-md text-center"><MS name={r.sts} className={`${r.stsC} text-[18px]`} /></td>
                <td className="py-sm px-md text-on-surface-variant">
                  <div className="text-[#e5e2e3]">{r.date}</div>
                  <div className="font-mono-data text-mono-data text-text-muted">{r.time}</div>
                </td>
                <td className="py-sm px-md">
                  <div className="text-on-surface font-medium group-hover:text-primary transition-colors">{r.m}</div>
                  <div className="flex items-center gap-xs mt-0.5">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-sm bg-surface-container-high border border-border-subtle font-mono-data text-[8px] uppercase tracking-wider ${r.tagC}`}>{r.tag}</span>
                  </div>
                </td>
                <td className="py-sm px-md text-on-surface-variant font-mono-data text-mono-data">{r.acc}</td>
                <td className={`py-sm px-md text-right font-mono-data tabular-nums ${r.amtC}`}>{r.amt}</td>
                <td className="py-sm px-md text-right text-text-muted font-mono-data tabular-nums">{r.bal}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-sm flex justify-between items-center border-t border-border-subtle bg-surface-background relative z-10">
          <span className="font-mono-data text-mono-data text-text-muted">Showing 1-3 of 14,204</span>
          <div className="flex gap-xs">
            <button className="p-xs border border-border-subtle rounded hover:bg-surface-container-high transition-colors text-on-surface-variant disabled:opacity-50" disabled>
              <MS name="chevron_left" className="text-[16px]" />
            </button>
            <button className="p-xs border border-border-subtle rounded hover:bg-surface-container-high transition-colors text-on-surface-variant">
              <MS name="chevron_right" className="text-[16px]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
