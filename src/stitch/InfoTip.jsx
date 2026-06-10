// Ícono de info con tooltip CSS (hover + focus). Explica de dónde sale un número.
// Tooltip glass del tema; accesible por teclado. Compartido por Dashboard y
// Reportes (sin dependencia de Recharts).
import MS from './MS';
import { tr } from '../i18n/runtime';

export function InfoTip({ text, label }) {
  if (label == null) label = tr('common.howCalculated');
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

export default InfoTip;
