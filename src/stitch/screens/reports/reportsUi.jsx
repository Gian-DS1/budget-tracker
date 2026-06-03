// Primitivas de UI de Reportes. Estilo surface-panel/glass consistente con el tema.
import MS from '../../MS';

// Panel de reporte: marco + título mono + icono + contenido.
export function ReportCard({ title, icon, className = '', children }) {
  return (
    <div className={`bg-surface-panel border border-border-subtle rounded-lg inner-glow p-lg flex flex-col ${className}`}>
      <div className="flex justify-between items-center mb-md border-b border-border-subtle pb-sm">
        <h2 className="font-mono-data text-mono-data text-on-surface-variant uppercase">{title}</h2>
        {icon && <MS name={icon} className="!text-[16px] text-text-muted" />}
      </div>
      {children}
    </div>
  );
}

// Tarjeta de insight: número grande + etiqueta + icono.
export function InsightCard({ label, value, sub, icon, cls = 'text-on-surface' }) {
  return (
    <div className="bg-surface-panel border border-border-subtle rounded-lg inner-glow p-lg flex flex-col gap-sm">
      <div className="flex justify-between items-start">
        <span className="font-mono-data text-mono-data text-text-muted uppercase">{label}</span>
        {icon && <MS name={icon} className={`!text-[16px] ${cls}`} />}
      </div>
      <span className={`font-headline-md text-[22px] tracking-tight whitespace-nowrap overflow-hidden text-ellipsis ${cls}`}>{value}</span>
      {sub && <span className="font-label-sm text-label-sm text-text-muted">{sub}</span>}
    </div>
  );
}

// KPI de salud (igual estilo que InsightCard pero con color semántico en el valor).
export function Kpi({ l, v, d, c = 'text-on-surface-variant', icon }) {
  return (
    <div className="bg-surface-panel border border-border-subtle rounded-lg inner-glow p-lg flex flex-col gap-sm">
      <div className="flex justify-between items-start">
        <span className="font-mono-data text-mono-data text-text-muted uppercase">{l}</span>
        {icon && <MS name={icon} className={`!text-[16px] ${c}`} />}
      </div>
      <span className="font-headline-md text-headline-md tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">{v}</span>
      <span className={`font-label-sm text-label-sm ${c}`}>{d}</span>
    </div>
  );
}
