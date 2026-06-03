// Número animado con count-up: incrementa rápido y desacelera (ease-out) hasta el
// valor final. Para KPIs hero y totales destacados. Respeta reduced-motion.
import { useEffect, useRef, useState } from 'react';
import { countUpValue } from './countUpValue';

const prefersReduced = () =>
  typeof window !== 'undefined'
  && window.matchMedia
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function CountUp({ value, format = (v) => String(v), duration = 700 }) {
  const target = Number(value) || 0;
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);
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

  return <>{format(display)}</>;
}
