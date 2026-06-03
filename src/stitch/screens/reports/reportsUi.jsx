// Primitivas de UI de Reportes. Estilo surface-panel/glass consistente con el tema.
import MS from '../../MS';
import { InfoTip } from '../../InfoTip';

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

// KPI de salud. `info` (opcional) muestra un InfoTip que explica el número. El
// valor usa text-[20px] + tracking-tight y NO trunca (whitespace-nowrap sin
// ellipsis) para que el monto siempre se vea completo.
export function Kpi({ l, v, d, c = 'text-on-surface-variant', icon, info }) {
  return (
    <div className="bg-surface-panel border border-border-subtle rounded-lg inner-glow p-lg flex flex-col gap-sm">
      <div className="flex justify-between items-start gap-xs">
        <span className="font-mono-data text-mono-data text-text-muted uppercase flex items-center gap-xs min-w-0">
          <span className="truncate">{l}</span>
          {info && <InfoTip text={info} />}
        </span>
        {icon && <MS name={icon} className={`!text-[16px] shrink-0 ${c}`} />}
      </div>
      <span className="font-headline-md text-[20px] tracking-tight whitespace-nowrap">{v}</span>
      <span className={`font-label-sm text-label-sm ${c}`}>{d}</span>
    </div>
  );
}
