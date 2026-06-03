// Número animado con count-up: incrementa rápido y desacelera (ease-out) hasta el
// valor final. Para KPIs hero y totales destacados. Respeta reduced-motion.
import { useEffect, useRef, useState } from 'react';
import { countUpValue } from './countUpValue';

const prefersReduced = () =>
  typeof window !== 'undefined'
  && window.matchMedia
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function CountUp({ value, format = (v) => String(v), duration = 700, children }) {
  const target = Number(value) || 0;
  // Arranca en 0 para que el PRIMER montaje anime de 0 → valor (no solo en cambios).
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);
  const rafRef = useRef(0);

  useEffect(() => {
    // Sin animación si el usuario lo pide o si no hay cambio real.
    if (prefersReduced() || fromRef.current === target) {
      setDisplay(target);
      fromRef.current = target;
      return undefined;
    }
    const from = fromRef.current;
    const start = performance.now();
    const tick = (now) => {
      const progress = (now - start) / duration;
      if (progress >= 1) {
        setDisplay(target);
        fromRef.current = target;
        return;
      }
      setDisplay(countUpValue(from, target, progress));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  // Render-prop: si children es una función, recibe el valor animado en vivo (para
  // que otros elementos —p. ej. un anillo— suban en sincronía con el número).
  if (typeof children === 'function') return children(display);
  return <>{format(display)}</>;
}
