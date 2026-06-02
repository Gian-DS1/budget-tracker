// Feedback — lenguaje Stitch (coherente con el sistema Romer).
import MS from '../MS';

export default function StitchFeedback() {
  return (
    <div className="p-margin-safe max-w-[1728px] mx-auto w-full">
      <div className="mb-xl">
        <div className="flex items-center gap-sm mb-xs">
          <span className="w-2 h-2 rounded-full bg-primary live-dot" />
          <span className="font-mono-data text-mono-data text-primary uppercase tracking-wider">Beta Channel</span>
        </div>
        <h1 className="font-headline-lg text-headline-lg text-on-surface">Feedback &amp; Telemetry</h1>
        <p className="font-body-md text-body-md text-text-muted mt-sm max-w-2xl">Report anomalies, request features, or send a transmission to the operations team.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
        <form className="lg:col-span-2 bg-surface-panel border border-border-subtle rounded-lg inner-glow p-lg flex flex-col gap-md">
          <div className="flex flex-col gap-xs">
            <label className="font-mono-data text-mono-data text-text-muted uppercase">Transmission Type</label>
            <div className="relative">
              <select className="w-full appearance-none bg-surface-container-lowest border border-border-subtle rounded py-sm px-md font-label-sm text-label-sm text-on-surface focus:outline-none focus:border-primary inner-glow">
                <option>Bug Report</option><option>Feature Request</option><option>General Feedback</option>
              </select>
              <MS name="expand_more" className="absolute right-md top-1/2 -translate-y-1/2 text-text-muted pointer-events-none text-[18px]" />
            </div>
          </div>
          <div className="flex flex-col gap-xs">
            <label className="font-mono-data text-mono-data text-text-muted uppercase">Message</label>
            <textarea rows={6} className="w-full bg-surface-container-lowest border border-border-subtle rounded py-sm px-md font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary inner-glow resize-none" placeholder="Describe the signal…" />
          </div>
          <button className="self-start bg-primary text-on-primary font-label-sm text-label-sm uppercase tracking-widest px-lg py-sm rounded hover:bg-primary-container transition-colors inner-glow flex items-center gap-sm">
            <MS name="send" className="text-[16px]" /> Transmit
          </button>
        </form>

        <aside className="bg-surface-card border border-border-subtle rounded-lg inner-glow p-lg flex flex-col gap-md h-fit">
          <div className="flex items-center gap-sm">
            <MS name="info" className="text-secondary text-[20px]" />
            <h2 className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface">Direct Channel</h2>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant">Transmissions route directly to the operator. No tickets, no queue — autonomous handling.</p>
          <div className="border-t border-border-subtle pt-md flex flex-col gap-sm">
            <span className="font-mono-data text-mono-data text-text-muted">RESPONSE SLA</span>
            <span className="font-headline-md text-[22px] text-tertiary tracking-tight">&lt; 24h</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
