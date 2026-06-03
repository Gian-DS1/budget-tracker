// Primitivas de UI del Dashboard (celdas del bento). Estilo glass consistente
// con el resto de la app.
import MS from '../../MS';

// InfoTip vive en src/stitch/InfoTip.jsx (compartido con Reportes). Se re-exporta
// aquí para no romper los imports existentes del Dashboard.
export { InfoTip } from '../../InfoTip';

// Celda del bento: marco glass + título mono opcional + contenido.
export function BentoCell({ title, icon, className = '', children, span = '' }) {
  return (
    <div className={`glass-card rounded-lg inner-glow p-md flex flex-col ${span} ${className}`}>
      {title && (
        <div className="flex justify-between items-center border-b border-border-subtle pb-sm mb-md">
          <span className="font-mono-data text-mono-data text-on-surface-variant uppercase">{title}</span>
          {icon && <MS name={icon} className="!text-[14px] text-text-muted" />}
        </div>
      )}
      {children}
    </div>
  );
}

// Placeholder discreto cuando una celda no tiene datos.
export function EmptyCell({ icon = 'inbox', message }) {
  return (
    <div className="flex-grow flex flex-col items-center justify-center text-center gap-sm py-lg">
      <MS name={icon} className="text-[24px] text-text-muted" />
      <p className="font-body-md text-body-md text-text-muted">{message}</p>
    </div>
  );
}

// Métrica KPI compacta.
export function Stat({ label, value, cls = 'text-on-surface', sub, warn }) {
  return (
    <div className="flex flex-col gap-xs">
      {label && <span className="font-mono-data text-mono-data text-text-muted uppercase">{label}</span>}
      <span className={`font-headline-md text-[20px] tracking-tight whitespace-nowrap overflow-hidden text-ellipsis ${cls}`}>{value}</span>
      {sub && <span className={`font-label-sm text-label-sm flex items-center gap-xs ${cls}`}>{warn && <MS name="warning" className="!text-[13px]" />}{sub}</span>}
    </div>
  );
}
