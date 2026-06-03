// Primitivas de UI del Dashboard (celdas del bento). Estilo glass consistente
// con el resto de la app.
import MS from '../../MS';

// Ícono de info con tooltip CSS (hover + focus). Explica de dónde sale un número.
// Tooltip glass del tema; accesible por teclado. Sin dependencia de Recharts.
export function InfoTip({ text, label = 'Cómo se calcula' }) {
  return (
    <span className="relative inline-flex group/info align-middle">
      <button
        type="button"
        tabIndex={0}
        aria-label={label}
        className="text-text-muted hover:text-on-surface focus:text-on-surface outline-none"
      >
        <MS name="info" className="!text-[13px]" />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute z-50 left-1/2 -translate-x-1/2 bottom-[calc(100%+6px)] w-[200px] bg-surface-card border border-border-subtle rounded p-sm inner-glow font-mono-data text-mono-data text-on-surface-variant normal-case tracking-normal opacity-0 translate-y-1 transition-all duration-150 ease-out group-hover/info:opacity-100 group-hover/info:translate-y-0 group-focus-within/info:opacity-100 group-focus-within/info:translate-y-0"
      >
        {text}
      </span>
    </span>
  );
}

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
