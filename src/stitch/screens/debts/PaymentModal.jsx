// Modal de pago de cuota: monto + fecha + nota. Crea el pago y una transacción de
// gasto enlazada (base caja). Prellena el monto con la cuota mensual.
import { useState } from 'react';
import toast from 'react-hot-toast';
import StitchCurrencyInput from '../../StitchCurrencyInput';
import StitchDatePicker from '../../StitchDatePicker';
import useDebtStore from '../../../stores/useDebtStore';
import { isDemoActive, demoAddDebtPayment } from '../../demoMode';
import { todayISO, formatCurrency } from '../../../utils/formatters';
import { useI18n } from '../../../contexts/I18nContext';
import { toastCelebrate } from '../../toastCelebrate';
import { Modal, Field, FormActions, inputCls } from './debtsUi';

const fmt = (n, c) => formatCurrency(n, c);

export default function PaymentModal({ debt, onClose }) {
  const { t } = useI18n();
  const addPayment = useDebtStore((s) => s.addPayment);
  const [amount, setAmount] = useState(debt.monthlyPayment ? String(debt.monthlyPayment) : '');
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt <= 0) return;
    if (isDemoActive()) demoAddDebtPayment(debt.id, amt, date, note.trim());
    else await addPayment(debt.id, amt, date, note.trim());
    const newBal = Number(debt.currentBalance) - amt;
    if (newBal <= 0) toastCelebrate(t('screens.debts.debtPaidOff'));
    else toast.success(t('screens.debts.paymentRegistered').replace('{amt}', fmt(amt, debt.currency)), { duration: 4000 });
    onClose();
  };

  return (
    <Modal title={`${t('screens.debts.payTitle')} · ${debt.creditorName}`} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-md">
        <div className="bg-surface-container-lowest border border-border-subtle rounded p-md inner-glow flex justify-between items-center">
          <span className="font-mono-data text-mono-data text-text-muted uppercase">{t('screens.debts.currentBalance')}</span>
          <span className="font-mono-data text-[15px] text-on-surface">{fmt(debt.currentBalance, debt.currency)}</span>
        </div>
        <Field label={t('screens.debts.paymentAmount')}><StitchCurrencyInput value={amount} onChange={setAmount} className={inputCls} autoFocus /></Field>
        <div className="grid grid-cols-2 gap-md">
          <Field label={t('transactions.date')}><StitchDatePicker value={date} onChange={setDate} max={todayISO()} /></Field>
          <Field label={t('screens.vaults.noteOptional')}><input value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} placeholder={t('screens.debts.examplePaymentNote')} /></Field>
        </div>
        <p className="font-mono-data text-mono-data text-text-muted normal-case tracking-normal">{t('screens.debts.linkedPaymentNote')}</p>
        <FormActions onCancel={onClose} label={t('screens.debts.registerPayment')} disabled={!Number(amount)} />
      </form>
    </Modal>
  );
}
