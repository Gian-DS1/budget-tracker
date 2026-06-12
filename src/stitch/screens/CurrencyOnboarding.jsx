// CurrencyOnboarding — overlay bloqueante para usuarios nuevos sin moneda elegida.
// Sin botón de cerrar; desaparece al confirmar la moneda.

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useI18n } from '../../contexts/I18nContext';
import usePrefsStore from '../../stores/usePrefsStore';
import StitchSelect from '../StitchSelect';
import { currencyOptions } from '../../utils/currencyOptions';
import { currentLocale } from '../../i18n/runtime';
import { EASE_OUT } from '../motionTokens';

export default function CurrencyOnboarding() {
  const { t } = useI18n();
  const setCurrency = usePrefsStore((s) => s.setCurrency);
  const [picked, setPicked] = useState('');

  const options = currencyOptions(currentLocale());
  const title = t('screens.currencyOnboarding.title');

  const handleConfirm = () => {
    if (!picked) return;
    setCurrency(picked);
    // setCurrency es optimista: actualiza el store de inmediato, el gate
    // desaparece solo porque currency pasa de null a un código.
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-md"
      style={{ background: 'rgba(0,0,0,0.72)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.18 } }}
      exit={{ opacity: 0, transition: { duration: 0.14 } }}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="bg-surface-card border border-border-subtle rounded-lg inner-glow w-full max-w-sm p-lg flex flex-col gap-lg outline-none"
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0, transition: { duration: 0.2, ease: EASE_OUT } }}
        exit={{ opacity: 0, scale: 0.98, y: 4, transition: { duration: 0.14, ease: EASE_OUT } }}
        tabIndex={-1}
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
