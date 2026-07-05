// Ícono de info con tooltip CSS (hover + focus). Explica de dónde sale un número.
// Tooltip glass del tema; accesible por teclado. Compartido por Dashboard y
// Reportes (sin dependencia de Recharts).
//
// Posicionamiento consciente del viewport: el tooltip se centra sobre el icono,
// pero si el icono vive pegado a un borde (p. ej. "Comprometido", alineado a la
// derecha), un panel centrado de 200px quedaría cortado fuera de la pantalla en
// móvil. Al abrir (hover/focus) se mide el ancla y se desplaza el panel lo justo
// para que quede COMPLETO dentro del viewport, con 8px de margen.
import { useRef, useState } from 'react';
import MS from './MS';
import { tr } from '../i18n/runtime';

const TIP_HALF = 100; // w-[200px] / 2
const MARGIN = 8;

export function InfoTip({ text, label }) {
  if (label == null) label = tr('common.howCalculated');
  const anchorRef = useRef(null);
  const [shift, setShift] = useState(0);

  const place = () => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const center = r.left + r.width / 2;
    let s = 0;
    if (center - TIP_HALF < MARGIN) s = MARGIN - (center - TIP_HALF);
    else if (center + TIP_HALF > window.innerWidth - MARGIN) s = window.innerWidth - MARGIN - (center + TIP_HALF);
    setShift(Math.round(s));
  };

  return (
    <span ref={anchorRef} onMouseEnter={place} onFocus={place} className="relative inline-flex group/info align-middle">
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
        style={{ left: `calc(50% + ${shift}px)` }}
        className="pointer-events-none absolute z-50 -translate-x-1/2 bottom-[calc(100%+6px)] w-[200px] bg-surface-card border border-border-subtle rounded p-sm inner-glow font-mono-data text-mono-data text-on-surface-variant normal-case tracking-normal opacity-0 translate-y-1 transition-all duration-150 ease-out group-hover/info:opacity-100 group-hover/info:translate-y-0 group-focus-within/info:opacity-100 group-focus-within/info:translate-y-0"
      >
        {text}
      </span>
    </span>
  );
}
