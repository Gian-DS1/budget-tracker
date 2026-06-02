// Settings — lenguaje Stitch (coherente con el sistema Romer).
import MS from '../MS';

export default function StitchSettings() {
  return (
    <div className="p-margin-safe max-w-[1728px] mx-auto w-full">
      <div className="mb-xl">
        <div className="flex items-center gap-sm mb-xs">
          <span className="font-mono-data text-mono-data text-secondary">SYS.CFG</span>
          <span className="w-1 h-1 rounded-full bg-border-subtle" />
          <span className="font-mono-data text-mono-data text-on-surface-variant uppercase">Operator Settings</span>
        </div>
        <h1 className="font-headline-lg text-headline-lg text-on-surface">Settings &amp; Utilities</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter">
        {/* Exchange rate */}
        <div className="bg-surface-panel border border-border-subtle rounded-lg inner-glow p-lg">
          <div className="flex justify-between items-center mb-lg border-b border-border-subtle pb-sm">
            <h2 className="font-mono-data text-mono-data text-on-surface-variant">EXCHANGE RATE · USD→DOP</h2>
            <MS name="currency_exchange" className="text-text-muted text-[16px]" />
          </div>
          <div className="flex items-end gap-md mb-md">
            <span className="font-headline-md text-[40px] text-on-surface tracking-tighter">58.75</span>
            <span className="font-mono-data text-mono-data text-tertiary mb-sm flex items-center gap-xs"><span className="w-1.5 h-1.5 rounded-full bg-tertiary live-dot" /> LIVE · BANCO POPULAR</span>
          </div>
          <div className="flex gap-sm">
            <input className="flex-1 bg-surface-container-lowest border border-border-subtle rounded py-sm px-md font-mono-data text-mono-data text-on-surface focus:outline-none focus:border-primary inner-glow" placeholder="Manual override…" />
            <button className="bg-primary text-on-primary font-label-sm text-label-sm uppercase tracking-widest px-md rounded hover:bg-primary-container transition-colors">Set</button>
          </div>
        </div>

        {/* Data utilities */}
        <div className="bg-surface-panel border border-border-subtle rounded-lg inner-glow p-lg">
          <div className="flex justify-between items-center mb-lg border-b border-border-subtle pb-sm">
            <h2 className="font-mono-data text-mono-data text-on-surface-variant">DATA UTILITIES</h2>
            <MS name="database" className="text-text-muted text-[16px]" />
          </div>
          <div className="flex flex-col gap-sm">
            {[
              { icon: 'upload_file', l: 'Import CSV / Excel', d: 'Bulk-load transactions' },
              { icon: 'download', l: 'Export Data', d: 'CSV · XLSX' },
              { icon: 'delete_sweep', l: 'Clear Local Cache', d: 'Resync from source', danger: true },
            ].map((r) => (
              <button key={r.l} className={`flex items-center gap-md p-md rounded border border-border-subtle bg-surface-card hover:bg-surface-container-high transition-colors text-left ${r.danger ? 'hover:border-accent-error/40' : ''}`}>
                <MS name={r.icon} className={`text-[20px] ${r.danger ? 'text-accent-error' : 'text-primary'}`} />
                <div className="flex flex-col">
                  <span className="font-label-sm text-label-sm text-on-surface">{r.l}</span>
                  <span className="font-mono-data text-mono-data text-text-muted">{r.d}</span>
                </div>
                <MS name="chevron_right" className="text-[18px] text-text-muted ml-auto" />
              </button>
            ))}
          </div>
        </div>

        {/* Appearance */}
        <div className="bg-surface-panel border border-border-subtle rounded-lg inner-glow p-lg lg:col-span-2">
          <div className="flex justify-between items-center mb-lg border-b border-border-subtle pb-sm">
            <h2 className="font-mono-data text-mono-data text-on-surface-variant">APPEARANCE</h2>
            <MS name="palette" className="text-text-muted text-[16px]" />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-on-surface">Theme</span>
              <span className="font-mono-data text-mono-data text-text-muted">Dark is the brand · light is opt-in</span>
            </div>
            <div className="flex gap-xs bg-surface-container-lowest border border-border-subtle rounded p-xs inner-glow">
              <button className="px-md py-xs rounded bg-primary text-on-primary font-label-sm text-label-sm">Dark</button>
              <button className="px-md py-xs rounded text-on-surface-variant font-label-sm text-label-sm hover:text-on-surface">Light</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
