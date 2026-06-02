// Placeholder para pantallas Stitch aún no reconstruidas 1:1.
import MS from '../MS';

export default function StitchPending({ title, source }) {
  return (
    <div className="p-margin-safe max-w-[1728px] mx-auto w-full">
      <div className="flex items-center gap-2 mb-sm">
        <span className="w-2 h-2 rounded-full bg-accent-warning live-dot" />
        <span className="font-mono-data text-mono-data text-accent-warning uppercase tracking-wider">Pending Rebuild</span>
      </div>
      <h1 className="font-headline-lg text-headline-lg text-on-surface mb-md">{title}</h1>
      <div className="glass-card rounded-lg p-lg border border-border-subtle inner-glow flex items-center gap-md max-w-2xl">
        <MS name="construction" className="text-[28px] text-accent-warning" />
        <div>
          <p className="font-body-md text-body-md text-on-surface">Pantalla pendiente de reconstrucción 1:1.</p>
          <p className="font-mono-data text-mono-data text-text-muted mt-xs">SOURCE: {source}</p>
        </div>
      </div>
    </div>
  );
}
