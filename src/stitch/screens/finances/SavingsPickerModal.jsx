// Pide al usuario de qué meta tomar el faltante de efectivo para cubrir un pago.
// Solo lista metas que pueden cubrirlo solas (currentAmount ≥ shortfall), porque no
// repartimos entre metas. Devuelve { goalId, amount: shortfall } al confirmar.
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useI18n } from '../../../contexts/I18nContext';
import { formatCurrency } from '../../../utils/formatters';
import { EASE_OUT } from '../../motionTokens';

const fmt = (n) => formatCurrency(n);

export default function SavingsPickerModal({ open, shortfall, goals, onPick, onClose }) {
  const { t } = useI18n();
  const eligibles = (goals || []).filter((g) => g.status !== 'completed' && Number(g.currentAmount) >= shortfall);
  const [goalId, setGoalId] = useState(eligibles[0]?.id || '');

  const confirm = () => {
    if (!goalId) return;
    onPick({ goalId, amount: shortfall });
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-md bg-black/50"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="glass-card rounded-lg inner-glow p-lg w-full max-w-[420px] flex flex-col gap-md"
            initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.16, ease: EASE_OUT }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-headline-md text-headline-md text-on-surface">{t('cascade.shortfallTitle')}</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              {t('cascade.shortfallBody').replace('{amt}', fmt(shortfall))}
            </p>

            <div className="flex flex-col gap-xs">
              <span className="font-mono-data text-mono-data text-text-muted uppercase">{t('cascade.takeFrom')}</span>
              {eligibles.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGoalId(g.id)}
                  className={`flex justify-between items-center px-md py-sm rounded border text-left transition-colors ${
                    goalId === g.id ? 'border-primary bg-surface-container-high' : 'border-border-subtle hover:bg-surface-container-high'
                  }`}
                >
                  <span className="font-label-sm text-label-sm text-on-surface truncate">{g.title}</span>
                  <span className="font-mono-data text-mono-data text-secondary shrink-0">{fmt(g.currentAmount)}</span>
                </button>
              ))}
            </div>

            <div className="flex justify-end gap-sm mt-sm">
              <button onClick={onClose} className="px-md py-sm rounded font-label-sm text-label-sm text-text-muted hover:text-on-surface">
                {t('common.cancel')}
              </button>
              <button
                onClick={confirm}
                disabled={!goalId}
                className="px-md py-sm rounded bg-primary text-on-primary font-label-sm text-label-sm disabled:opacity-40 active:scale-[0.97]"
              >
                {t('cascade.confirm')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
