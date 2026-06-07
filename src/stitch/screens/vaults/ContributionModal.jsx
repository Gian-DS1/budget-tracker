// Modal de aporte: monto + fecha + nota. Suma a la meta y crea una transacción de
// ahorro enlazada. Prellena el monto con el aporte mensual de la meta si existe.
import { useState } from 'react';
import toast from 'react-hot-toast';
import StitchCurrencyInput from '../../StitchCurrencyInput';
import StitchDatePicker from '../../StitchDatePicker';
import useSavingsStore from '../../../stores/useSavingsStore';
import { isDemoActive, demoAddContribution } from '../../demoMode';
import { todayISO, formatCurrency } from '../../../utils/formatters';
import { toastCelebrate } from '../../toastCelebrate';
import { Modal, Field, FormActions, inputCls } from './vaultsUi';

const fmt = (n, c) => formatCurrency(n, c);

export default function ContributionModal({ goal, onClose }) {
  const addContribution = useSavingsStore((s) => s.addContribution);
  const [amount, setAmount] = useState(goal.monthlyContribution ? String(goal.monthlyContribution) : '');
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt <= 0) return;
    if (isDemoActive()) demoAddContribution(goal.id, amt, date, note.trim());
    else await addContribution(goal.id, amt, date, note.trim());
    const done = Number(goal.currentAmount) + amt >= Number(goal.targetAmount);
    if (done) toastCelebrate('¡Meta completada!');
    else toast.success(`Aporte de ${fmt(amt, goal.currency)} registrado`, { duration: 4000 });
    onClose();
  };

  return (
    <Modal title={`Abonar · ${goal.title}`} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-md">
        <div className="bg-surface-container-lowest border border-border-subtle rounded p-md inner-glow flex justify-between items-center">
          <span className="font-mono-data text-mono-data text-text-muted uppercase">Saldo actual</span>
          <span className="font-mono-data text-[15px] text-on-surface">{fmt(goal.currentAmount, goal.currency)}</span>
        </div>
        <Field label="Monto a abonar"><StitchCurrencyInput value={amount} onChange={setAmount} className={inputCls} autoFocus /></Field>
        <div className="grid grid-cols-2 gap-md">
          <Field label="Fecha"><StitchDatePicker value={date} onChange={setDate} max={todayISO()} /></Field>
          <Field label="Nota (opcional)"><input value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} placeholder="Ej. Aporte de junio" /></Field>
        </div>
        <p className="font-mono-data text-mono-data text-text-muted normal-case tracking-normal">Se suma a la meta y se crea una transacción de ahorro enlazada automáticamente.</p>
        <FormActions onCancel={onClose} label="Abonar" disabled={!Number(amount)} />
      </form>
    </Modal>
  );
}
