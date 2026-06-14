// Modal "Apartar a ahorro": mueve efectivo a una meta. Reusa demoAddContribution
// (crea una transacción 'savings' que el selector getLiquidCash resta del efectivo).
// Solo se usa en modo demo (el Dashboard solo lo monta si isDemoActive()).
import { useState } from 'react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import StitchCurrencyInput from '../../StitchCurrencyInput';
import StitchSelect from '../../StitchSelect';
import StitchDatePicker from '../../StitchDatePicker';
import { useI18n } from '../../../contexts/I18nContext';
import { todayISO, formatCurrency } from '../../../utils/formatters';
import { demoAddContribution } from '../../demoMode';
import { EASE_OUT } from '../../motionTokens';

export default function SaveToVaultModal({ open, onClose, goals, availableCash }) {
  const { t } = useI18n();
  const [amount, setAmount] = useState('');
  const [goalId, setGoalId] = useState('');
  const [date, setDate] = useState(todayISO());

  const activeGoals = (goals || []).filter((g) => g.status !== 'completed');
  const options = activeGoals.map((g) => ({ value: g.id, label: g.title }));
  const numAmount = Number(amount) || 0;
  const over = numAmount > availableCash;
  const canSave = numAmount > 0 && goalId;

  const reset = () => { setAmount(''); setGoalId(''); setDate(todayISO()); };

  const submit = () => {
    if (!canSave) return;
    demoAddContribution(goalId, numAmount, date);
    toast.success(`${t('dashboard.saveDone')}: ${formatCurrency(numAmount)}`);
    reset();
    onClose();
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
            <h2 className="font-headline-md text-headline-md text-on-surface">{t('dashboard.saveToVaultTitle')}</h2>

            <label className="flex flex-col gap-xs">
              <span className="font-label-sm text-label-sm text-text-muted uppercase">{t('dashboard.saveAmount')}</span>
              <StitchCurrencyInput value={amount} onChange={setAmount} />
            </label>

            <label className="flex flex-col gap-xs">
              <span className="font-label-sm text-label-sm text-text-muted uppercase">{t('dashboard.saveToGoal')}</span>
              <StitchSelect value={goalId} onChange={setGoalId} options={options} />
            </label>

            <label className="flex flex-col gap-xs">
              <span className="font-label-sm text-label-sm text-text-muted uppercase">{t('transactions.date')}</span>
              <StitchDatePicker value={date} onChange={setDate} />
            </label>

            {over && (
              <span className="font-label-sm text-label-sm text-accent-warning">{t('dashboard.saveOverWarning')}</span>
            )}

            <div className="flex justify-end gap-sm mt-sm">
              <button onClick={onClose} className="px-md py-sm rounded font-label-sm text-label-sm text-text-muted hover:text-on-surface">
                {t('common.cancel')}
              </button>
              <button
                onClick={submit}
                disabled={!canSave}
                className="px-md py-sm rounded bg-primary text-on-primary font-label-sm text-label-sm disabled:opacity-40 active:scale-[0.97]"
              >
                {t('dashboard.saveConfirm')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
