import { useState, useRef, useId, useCallback } from 'react';
import { Info } from 'lucide-react';

// Ícono de información con tooltip explicativo (hover / foco de teclado / tap).
// Posiciona el contenido con `position: fixed` calculado al abrir, así escapa de
// cualquier contenedor con overflow (tablas con scroll horizontal, modales que
// scrollean) sin recortarse.
export default function InfoTooltip({ text, label = 'Cómo se calcula este número' }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const tipId = useId();

  const show = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    // Centrado bajo el ícono, recortado al viewport para no salirse por los lados.
    const left = Math.min(Math.max(r.left + r.width / 2, 130), window.innerWidth - 130);
    setCoords({ top: r.bottom + 8, left });
    setOpen(true);
  }, []);

  const hide = useCallback(() => setOpen(false), []);

  return (
    <span
      ref={triggerRef}
      className="info-tip"
      tabIndex={0}
      role="button"
      aria-label={label}
      aria-describedby={open ? tipId : undefined}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      <Info size={13} aria-hidden="true" />
      {open && (
        <span
          id={tipId}
          className="info-tip-content"
          role="tooltip"
          style={{
            position: 'fixed',
            top: coords.top,
            left: coords.left,
            transform: 'translateX(-50%)',
            opacity: 1,
            visibility: 'visible',
          }}
        >
          {text}
        </span>
      )}
    </span>
  );
}
