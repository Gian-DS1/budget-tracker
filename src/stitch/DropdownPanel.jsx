// Panel flotante compartido por todos los dropdowns del tema (StitchSelect,
// StitchCategorySelect, StitchDatePicker). Se renderiza en un PORTAL al <body>
// con position:fixed para que NUNCA lo recorte un contenedor con overflow (modal,
// barra de filtros) ni genere scroll en la página.
//
// Posicionamiento inteligente (como las libs de producción):
//   - Por defecto abre hacia abajo, alineado a la izquierda del trigger.
//   - Si no hay espacio abajo, abre hacia arriba (flip).
//   - Si se saldría por la derecha, se alinea a la derecha del trigger.
//   - El ancho mínimo = ancho del trigger (los selects copian su ancho).
//
// Anima con la misma personalidad Emil (ease-out, scale, origin-aware).

import { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { EASE_OUT } from './StitchMotion';

const GAP = 6; // px entre trigger y panel
const MARGIN = 8; // margen mínimo respecto al borde del viewport

export default function DropdownPanel({
  triggerRef,
  panelRef, // ref opcional al nodo del panel (para el click-fuera del padre)
  open,
  reduce,
  matchTriggerWidth = true, // el panel toma al menos el ancho del trigger
  maxHeight = 320,
  scroll = true, // si false, el hijo gestiona su propio scroll interno
  className = '',
  children,
  ...rest
}) {
  const [pos, setPos] = useState(null);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;

    const compute = () => {
      const r = triggerRef.current?.getBoundingClientRect();
      if (!r) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      const spaceBelow = vh - r.bottom - GAP - MARGIN;
      const spaceAbove = r.top - GAP - MARGIN;
      // Abre hacia arriba solo si abajo no cabe Y arriba hay más espacio.
      const placeUp = spaceBelow < Math.min(maxHeight, 240) && spaceAbove > spaceBelow;

      const availH = Math.max(120, Math.floor(placeUp ? spaceAbove : spaceBelow));
      const cappedH = Math.min(maxHeight, availH);

      // Ancho: usamos minWidth = ancho del trigger (el panel puede crecer para
      // que el contenido quepa, sin scroll horizontal), con un tope = viewport.
      const maxW = vw - 2 * MARGIN;
      const next = {
        minWidth: matchTriggerWidth ? Math.min(r.width, maxW) : undefined,
        maxWidth: maxW,
        maxHeight: cappedH,
        placeUp,
      };

      // Horizontal: alinea a la izquierda; si el ancho del trigger empujaría el
      // panel fuera por la derecha, alinea a la derecha del trigger.
      const estW = next.minWidth || 260;
      let left = r.left;
      if (left + estW + MARGIN > vw) left = Math.max(MARGIN, r.right - estW);

      next.left = Math.round(left);
      next.top = placeUp ? undefined : Math.round(r.bottom + GAP);
      next.bottom = placeUp ? Math.round(vh - r.top + GAP) : undefined;

      setPos(next);
    };

    compute();
    window.addEventListener('resize', compute);
    window.addEventListener('scroll', compute, true); // captura scroll en cualquier contenedor
    return () => {
      window.removeEventListener('resize', compute);
      window.removeEventListener('scroll', compute, true);
    };
  }, [open, triggerRef, matchTriggerWidth, maxHeight]);

  if (!open || !pos) return null;

  const style = {
    position: 'fixed',
    left: pos.left,
    top: pos.top,
    bottom: pos.bottom,
    minWidth: pos.minWidth,
    maxWidth: pos.maxWidth,
    zIndex: 60,
    transformOrigin: pos.placeUp ? 'bottom' : 'top',
  };

  const motionProps = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, scale: 0.96, y: pos.placeUp ? 4 : -4 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.98, y: pos.placeUp ? 2 : -2 },
      };

  return createPortal(
    <motion.div
      ref={panelRef}
      {...motionProps}
      transition={{ duration: 0.16, ease: EASE_OUT }}
      style={style}
      className={`stitch-scroll bg-surface-card border border-border-subtle rounded-lg inner-glow shadow-xl overflow-hidden ${className}`}
      {...rest}
    >
      {scroll ? (
        <div style={{ maxHeight: pos.maxHeight }} className="overflow-y-auto overflow-x-hidden">
          {children}
        </div>
      ) : (
        // El hijo decide su layout; le pasamos el alto máximo disponible.
        <div style={{ maxHeight: pos.maxHeight }} className="flex flex-col overflow-x-hidden">
          {typeof children === 'function' ? children(pos.maxHeight) : children}
        </div>
      )}
    </motion.div>,
    document.body,
  );
}
