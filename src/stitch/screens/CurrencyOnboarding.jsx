// CurrencyOnboarding — overlay bloqueante para usuarios nuevos sin moneda elegida.
// Sin botón de cerrar; Escape y click-fuera no tienen efecto (gate de onboarding).
//
// Por qué NO usa ModalShell: ModalShell llama requestClose en Escape y en el
// backdrop — no hay prop para deshabilitar ese comportamiento. Pasar onClose=()=>{}
// animaría la salida y dejaría el modal oculto sin forma de reabrirlo, rompiendo el
// gate. En su lugar reproducimos lo que ModalShell añade sobre un motion.div propio:
//   • focus al montar + restore al desmontar  (WCAG 2.4.3)
//   • focus trap Tab/Shift-Tab               (WCAG 2.1.2)
//   • variantes con useReducedMotion         (WCAG 2.3.3)

import { useMemo, useRef, useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useI18n } from '../../contexts/I18nContext';
import usePrefsStore from '../../stores/usePrefsStore';
import StitchSelect from '../StitchSelect';
import StitchCurrencyInput from '../StitchCurrencyInput';
import { currencyOptions } from '../../utils/currencyOptions';
import { EASE_OUT } from '../motionTokens';

// Selector de elementos enfocables — idéntico al de ModalShell.
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function CurrencyOnboarding() {
  const { t, language } = useI18n();
  const setCurrency = usePrefsStore((s) => s.setCurrency);
  const setInitialCashBalance = usePrefsStore((s) => s.setInitialCashBalance);
  const [picked, setPicked] = useState('');
  const [cash, setCash] = useState('');

  // Fix 2: memoizar opciones de moneda; se recalcula sólo si cambia el idioma.
  // Derivamos el locale a partir de `language` (misma lógica que currentLocale())
  // para que ESLint pueda verificar la dep sin falsos warnings.
  const locale = language === 'es' ? 'es-DO' : 'en-US';
  const options = useMemo(() => currencyOptions(locale), [locale]);

  const title = t('screens.currencyOnboarding.title');

  // Refs para focus management (WCAG 2.4.3).
  const panelRef = useRef(null);
  const prevFocusRef = useRef(null);

  // Al montar: guarda el foco actual y muévelo al panel.
  // Al desmontar: devuelve el foco al disparador.
  useEffect(() => {
    prevFocusRef.current = document.activeElement;
    panelRef.current?.focus({ preventScroll: true });
    return () => {
      if (prevFocusRef.current instanceof HTMLElement) {
        prevFocusRef.current.focus({ preventScroll: true });
      }
    };
  }, []);

  // Focus trap Tab/Shift-Tab (WCAG 2.1.2); Escape no hace nada (gate bloqueante).
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = panel.querySelectorAll(FOCUSABLE);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      // Si el foco vive fuera del panel (ej. dropdown en portal), no interferir.
      if (!panel.contains(active) && active !== panel) return;
      if (e.shiftKey && (active === first || active === panel)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const reduce = useReducedMotion();

  // Variantes de animación respetando reduced-motion (WCAG 2.3.3).
  const panelVariants = reduce
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

  const handleConfirm = () => {
    if (!picked) return;
    // Persistir el efectivo inicial declarado (opcional; vacío = 0, se declara luego).
    if (cash) setInitialCashBalance(cash);
    setCurrency(picked);
    // setCurrency es optimista: actualiza el store de inmediato; el gate
    // desaparece solo porque currency pasa de null a un código.
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-md"
      style={{ background: 'rgba(0,0,0,0.72)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.18 } }}
      exit={{ opacity: 0, transition: { duration: 0.14 } }}
      // Backdrop no cierra (gate bloqueante).
    >
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="bg-surface-card border border-border-subtle rounded-lg inner-glow w-full max-w-[400px] p-lg flex flex-col gap-lg outline-none"
        style={{ transformOrigin: 'center' }}
        onClick={(e) => e.stopPropagation()}
        {...panelVariants}
      >
        {/* Encabezado */}
        <div className="flex flex-col gap-sm">
          <h2 className="font-headline-md text-headline-md text-on-surface">
            {title}
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            {t('screens.currencyOnboarding.subtitle')}
          </p>
        </div>

        {/* Selector de moneda */}
        <StitchSelect
          value={picked}
          onChange={setPicked}
          options={options}
          placeholder={t('screens.currencyOnboarding.placeholder')}
        />

        {/* Efectivo inicial (opcional). Es enfocable → el focus-trap lo incluye solo. */}
        <label className="flex flex-col gap-xs">
          <span className="font-mono-data text-mono-data text-text-muted uppercase">{t('screens.currencyOnboarding.cashLabel')}</span>
          <StitchCurrencyInput value={cash} onChange={setCash} />
          <span className="font-label-sm text-label-sm text-text-muted">{t('screens.currencyOnboarding.cashHelp')}</span>
        </label>

        {/* Botón confirmar */}
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!picked}
          className="bg-primary text-on-primary font-label-sm text-label-sm uppercase tracking-widest font-bold px-md py-sm rounded hover:bg-primary-container transition-colors inner-glow disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {t('screens.currencyOnboarding.confirm')}
        </button>
      </motion.div>
    </motion.div>
  );
}
