// Carcasa animada compartida por todos los modales del tema (Ahorros, Tarjetas,
// Deudas, Transacciones). Encapsula la micro-interacción de entrada/salida
// (filosofía Emil Kowalski) en UN solo lugar para que los modales locales no
// dupliquen la lógica de motion.
//
// Patrón autocontenido: los call-sites montan el modal con `{cond && <Modal/>}`
// (sin AnimatePresence externo). Para que la animación de SALIDA ocurra antes de
// que el padre desmonte, ModalShell gestiona su propio estado `open`: arranca
// abierto y, al pedir cierre, dispara la salida y recién al terminar
// (onExitComplete) llama a onClose() del padre. Así no hay que envolver ningún
// call-site en AnimatePresence.
//
// Coherencia espacial (Emil): el modal debe SALIR igual sin importar quién pida
// el cierre (botón ✕, Escape, click en backdrop, o "Guardar"/"Cancelar" desde un
// formulario). Para lograrlo, ModalShell expone su `requestClose` (cierre con
// animación) por render-prop: `children` puede ser una función `(close) => …` y
// el formulario usa ese `close` en submit y en Cancelar, en vez del onClose crudo
// que desmontaría de golpe.
//
// Motion (coherente con StitchMotion/DropdownPanel):
//   - Backdrop: opacity 0→1, ease-out, ~160ms.
//   - Panel: scale 0.96→1 + opacity + y 8→0, EASE_OUT fuerte, ~200ms.
//     transform-origin: center (los modales son centrados, no anclados a un
//     trigger → la excepción correcta de la regla origin-aware de Emil).
//   - Salida más rápida que la entrada (el sistema responde rápido); nunca
//     escala a 0 (nada aparece/desaparece de la nada).
//   - reduced-motion: solo opacidad, sin movimiento.

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { EASE_OUT } from './motionTokens';

// Contexto: expone la función de cierre-con-animación a los hijos del modal.
// Cualquier formulario/botón dentro puede consumirla para que su cierre anime la
// salida en vez de desmontar el modal de golpe.
const ModalCloseContext = createContext(null);

// Hook para los hijos del modal: devuelve la función de cierre animado. Fuera de
// un ModalShell devuelve null (los consumidores deben tener un fallback al
// onClose normal: `useModalClose() ?? onClose`).
export function useModalClose() {
  return useContext(ModalCloseContext);
}

export default function ModalShell({ onClose, children, className = '', style }) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(true);

  // Pide cierre: anima la salida. onClose() del padre se llama en onExitComplete,
  // desmontando el modal recién cuando la animación termina.
  const requestClose = useCallback(() => setOpen(false), []);

  // Cerrar con Escape (un modal que se siente bien responde al teclado).
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') requestClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [requestClose]);

  const panel = reduce
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1, transition: { duration: 0.18 } },
        exit: { opacity: 0, transition: { duration: 0.12 } },
      }
    : {
        initial: { opacity: 0, scale: 0.96, y: 8 },
        animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.2, ease: EASE_OUT } },
        exit: { opacity: 0, scale: 0.98, y: 4, transition: { duration: 0.14, ease: EASE_OUT } },
      };

  return (
    <AnimatePresence onExitComplete={onClose}>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-md"
          style={{ background: 'rgba(0,0,0,0.66)' }}
          onClick={requestClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16, ease: EASE_OUT }}
        >
          <motion.div
            className={className}
            style={{ ...style, transformOrigin: 'center' }}
            onClick={(e) => e.stopPropagation()}
            {...panel}
          >
            <ModalCloseContext.Provider value={requestClose}>
              {/* requestClose también va por render-prop, por si el hijo prefiere
                  no usar el contexto. */}
              {typeof children === 'function' ? children(requestClose) : children}
            </ModalCloseContext.Provider>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
