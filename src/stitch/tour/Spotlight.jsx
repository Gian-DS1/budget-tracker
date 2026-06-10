// Spotlight — capa visual del tutorial (en portal, z muy alto).
//
// Oscurece toda la pantalla y deja un "hueco" iluminado sobre el elemento del
// paso (anchor), con un halo periwinkle. Junto al hueco muestra un globo con la
// explicación, el progreso y los controles (Atrás/Siguiente/Saltar). Anima la
// posición/tamaño del hueco entre pasos con spring. Respeta reduced-motion.
//
// Técnica del hueco: un div posicionado sobre el rect del anchor con un
// box-shadow gigante (0 0 0 9999px rgba(0,0,0,.72)) que oscurece TODO menos el
// recorte. Sin clip-paths ni 4 divs; un solo elemento, barato y nítido.

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import MS from '../MS';
import { useI18n } from '../../contexts/I18nContext';
import { SPRING_SOFT, SPRING_SNAP } from '../landingMotion';

const TOOLTIP_W = 340;
const GAP = 16; // separación entre el hueco y el globo
const MARGIN = 12; // margen mínimo al borde del viewport

// Espera (con timeout) a que aparezca el elemento del selector. Resuelve null si
// nunca aparece (páginas vacías / responsive): el paso degrada a centrado.
function waitForAnchor(selector, timeout = 1400) {
  return new Promise((resolve) => {
    if (!selector) return resolve(null);
    const found = document.querySelector(selector);
    if (found) return resolve(found);
    let done = false;
    const finish = (el) => { if (done) return; done = true; obs.disconnect(); clearTimeout(timer); resolve(el); };
    const obs = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) finish(el);
    });
    obs.observe(document.body, { childList: true, subtree: true });
    const timer = setTimeout(() => finish(null), timeout);
  });
}

export default function Spotlight({ step, stepIndex, total, navigate, onNext, onPrev, onSkip }) {
  const { t } = useI18n();
  const reduce = useReducedMotion();
  const [rect, setRect] = useState(null); // rect del anchor o null (centrado)
  const [ready, setReady] = useState(false);
  const [tip, setTip] = useState({ left: 0, top: 0, centered: true }); // posición del globo (medida real)
  const elRef = useRef(null);
  const tipRef = useRef(null);

  // Al cambiar de paso: navegar si hace falta, esperar el anchor, medir su rect.
  useEffect(() => {
    let cancelled = false;

    // Navegar a la ruta del paso (si es distinta). El router no expone la ruta
    // actual aquí sin hook extra; navegar siempre es idempotente para la misma
    // ruta y barato.
    if (step.route) navigate(step.route);

    (async () => {
      // Ocultar el globo mientras carga el nuevo paso (dentro del async para no
      // hacer setState síncrono en el cuerpo del effect → cascading renders).
      setReady(false);
      const el = step.anchor ? await waitForAnchor(step.anchor) : null;
      if (cancelled) return;
      elRef.current = el;
      if (el) {
        el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center', inline: 'nearest' });
        // Dar un frame al scroll antes de medir.
        await new Promise((r) => setTimeout(r, reduce ? 0 : 240));
        if (cancelled) return;
        setRect(measure(el, step.padding));
      } else {
        setRect(null);
      }
      setReady(true);
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex]);

  // Re-medir el anchor en scroll/resize mientras el paso lo tiene.
  useLayoutEffect(() => {
    if (!elRef.current) return undefined;
    const onChange = () => { if (elRef.current) setRect(measure(elRef.current, step.padding)); };
    window.addEventListener('scroll', onChange, true);
    window.addEventListener('resize', onChange);
    return () => {
      window.removeEventListener('scroll', onChange, true);
      window.removeEventListener('resize', onChange);
    };
  }, [stepIndex, step.padding]);

  // Posicionar el globo usando su TAMAÑO REAL (medido del DOM), no estimado. Así
  // queda siempre completamente visible sin importar el alto del texto ni el
  // tamaño de pantalla; si no cabe bien junto al elemento, se centra.
  useLayoutEffect(() => {
    if (!ready) return undefined;
    const place = () => {
      const size = tipRef.current
        ? { w: tipRef.current.offsetWidth, h: tipRef.current.offsetHeight }
        : { w: TOOLTIP_W, h: 240 };
      setTip(computeTipPosition(rect, step.placement, size));
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [ready, rect, step.placement]);

  // Teclado: Esc=saltar, →/Enter=siguiente, ←=atrás.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onSkip(); }
      else if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); onNext(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); onPrev(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onSkip, onNext, onPrev]);

  const isFirst = stepIndex === 0;
  const isLast = stepIndex === total - 1;
  const centered = !rect; // sin anchor o no encontrado → no hay hueco que recortar

  const overlaySpring = reduce ? { duration: 0.18 } : SPRING_SOFT;

  return createPortal(
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label={t('common.guidedTutorial')}>
      {/* Capa que captura clics (evita interactuar con la app durante el tour) */}
      <div className="absolute inset-0" onClick={onSkip} aria-hidden="true" />

      {/* Hueco iluminado (solo si hay rect). El box-shadow gigante oscurece el resto. */}
      {!centered && (
        <motion.div
          className="absolute pointer-events-none rounded-lg"
          initial={false}
          animate={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
          transition={overlaySpring}
          style={{
            boxShadow: '0 0 0 9999px rgba(7,7,8,0.72), 0 0 0 2px rgba(190,194,255,0.9), 0 0 24px 4px rgba(190,194,255,0.45)',
          }}
        />
      )}
      {/* Cuando es centrado, un velo plano (no hay hueco que recortar) */}
      {centered && <div className="absolute inset-0" style={{ background: 'rgba(7,7,8,0.72)' }} aria-hidden="true" />}

      {/* Globo de explicación */}
      <AnimatePresence mode="wait">
        {ready && (
          <motion.div
            key={step.id}
            ref={tipRef}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.98 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1, transition: SPRING_SNAP }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            className="fixed bg-surface-card border border-border-subtle rounded-lg inner-glow shadow-2xl p-lg flex flex-col gap-sm pointer-events-auto"
            style={{ width: TOOLTIP_W, left: tip.left, top: tip.top }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono-data text-mono-data text-primary uppercase tracking-widest">
                {t('tour.stepOf').replace('{a}', stepIndex + 1).replace('{b}', total)}
              </span>
              <button onClick={onSkip} className="text-text-muted hover:text-on-surface p-xs -mr-xs rounded hover:bg-surface-container-high transition-colors" aria-label={t('tour.skipTutorial')}>
                <MS name="close" className="!text-[18px]" />
              </button>
            </div>

            <h3 className="font-headline-md text-[20px] font-bold text-on-surface tracking-tight">{step.title}</h3>
            <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">{step.body}</p>

            {/* Progreso (puntos) */}
            <div className="flex items-center gap-[5px] mt-xs mb-sm" aria-hidden="true">
              {Array.from({ length: total }).map((_, i) => (
                <span
                  key={i}
                  className={`h-1 rounded-full transition-all ${i === stepIndex ? 'w-5 bg-primary' : 'w-1 bg-surface-container-highest'}`}
                />
              ))}
            </div>

            <div className="flex items-center justify-between gap-sm">
              <button onClick={onSkip} className="font-label-sm text-label-sm text-text-muted hover:text-on-surface transition-colors">
                {t('tour.skipTutorial')}
              </button>
              <div className="flex items-center gap-sm">
                {!isFirst && (
                  <button onClick={onPrev} className="px-md py-sm border border-border-subtle text-on-surface-variant font-label-sm text-label-sm rounded hover:bg-surface-container-high transition-colors">
                    {t('tour.back')}
                  </button>
                )}
                <button onClick={onNext} className="px-md py-sm bg-primary text-on-primary font-label-sm text-label-sm uppercase tracking-widest font-bold rounded hover:bg-primary-container inner-glow transition-colors flex items-center gap-xs">
                  {isLast ? t('tour.finish') : t('common.next')}
                  {!isLast && <MS name="arrow_forward" className="!text-[16px]" />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body,
  );
}

// Mide el rect del elemento (viewport coords) con padding de halo.
function measure(el, padding = 8) {
  const r = el.getBoundingClientRect();
  const p = padding;
  return {
    top: Math.max(0, r.top - p),
    left: Math.max(0, r.left - p),
    width: r.width + p * 2,
    height: r.height + p * 2,
  };
}

// Centra el globo en el viewport (coordenadas fixed).
function centerOf(size) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  return {
    left: Math.round((vw - size.w) / 2),
    top: Math.max(MARGIN, Math.round((vh - size.h) / 2)),
    centered: true,
  };
}

// Calcula la posición del globo usando su tamaño REAL (size = {w,h}).
// Estrategia: si el paso es centrado o el elemento ocupa casi toda la pantalla,
// va al centro. Si no, se coloca en el lado pedido SOLO si cabe completo; si no
// cabe en ningún lado con holgura, se centra. Siempre clamp al viewport para
// quedar 100% visible en cualquier tamaño de pantalla.
function computeTipPosition(rect, placement = 'bottom', size = { w: TOOLTIP_W, h: 240 }) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const { w, h } = size;

  // Sin anchor, placement 'center', o pantalla pequeña → centrar.
  if (!rect || placement === 'center' || vw < 600 || w + 2 * MARGIN >= vw) {
    return centerOf(size);
  }

  // Espacio disponible a cada lado del elemento.
  const space = {
    bottom: vh - (rect.top + rect.height) - GAP - MARGIN,
    top: rect.top - GAP - MARGIN,
    right: vw - (rect.left + rect.width) - GAP - MARGIN,
    left: rect.left - GAP - MARGIN,
  };

  // Orden de preferencia: el pedido primero, luego el resto por espacio.
  const order = [placement, ...['bottom', 'top', 'right', 'left'].filter((p) => p !== placement)];
  const need = (p) => (p === 'left' || p === 'right' ? w : h);
  const chosen = order.find((p) => space[p] >= need(p));

  // Si no cabe completo en ningún lado, centrar (más legible que pegarlo a un borde).
  if (!chosen) return centerOf(size);

  let left;
  let top;
  if (chosen === 'right') { left = rect.left + rect.width + GAP; top = rect.top + rect.height / 2 - h / 2; }
  else if (chosen === 'left') { left = rect.left - w - GAP; top = rect.top + rect.height / 2 - h / 2; }
  else if (chosen === 'top') { left = rect.left + rect.width / 2 - w / 2; top = rect.top - h - GAP; }
  else { left = rect.left + rect.width / 2 - w / 2; top = rect.top + rect.height + GAP; } // bottom

  // Clamp final al viewport (garantiza visibilidad completa).
  left = Math.min(Math.max(MARGIN, left), vw - w - MARGIN);
  top = Math.min(Math.max(MARGIN, top), vh - h - MARGIN);
  return { left, top, centered: false };
}
