// Modal de abono a una tarjeta: monto + fecha + nota. El abono LIQUIDA el saldo,
// no es un gasto del presupuesto (el gasto ya se contó al consumir).
import { useState } from 'react';
import toast from 'react-hot-toast';
import StitchCurrencyInput from '../../StitchCurrencyInput';
import StitchDatePicker from '../../StitchDatePicker';
import { isDemoActive, demoAddCardPayment } from '../../demoMode';
import useCreditCardStore from '../../../stores/useCreditCardStore';
import { getCardBalances } from '../../../utils/creditCards';
import { todayISO, formatCurrency } from '../../../utils/formatters';
import { Modal, Field, FormActions, inputCls } from './cardsUi';

const fmt = (n) => formatCurrency(n);

export default function PaymentModal({ card, transactions, onClose }) {
  const addCardPayment = useCreditCardStore((s) => s.addCardPayment);
  const bal = getCardBalances(card, transactions, new Date());
  const [amount, setAmount] = useState(bal.pendingBilled > 0 ? String(Math.round(bal.pendingBilled * 100) / 100) : '');
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt <= 0) return;
    const payload = { amount: amt, date, note: note.trim() };
    if (isDemoActive()) {
      demoAddCardPayment(card.id, payload);
      toast.success('Abono registrado');
    } else {
      await addCardPayment(card.id, payload);
    }
    // ¿Este abono SALDÓ un estado de cuenta que estaba pendiente? (no en prepagos
    // sobre una tarjeta que ya estaba al día).
    if (bal.pendingBilled > 0.01 && amt + bal.paid >= bal.billed - 0.01) {
      toast.success('Estado de cuenta saldado 🎉', { duration: 4000 });
    }
    onClose();
  };

  return (
    <Modal title={`Abono · ${card.name}`} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-md">
        <div className="bg-surface-container-lowest border border-border-subtle rounded p-md inner-glow flex justify-between items-center">
          <span className="font-mono-data text-mono-data text-text-muted uppercase">Por pagar</span>
          <span className="font-mono-data text-[15px] text-on-surface">{fmt(bal.pendingBilled)}</span>
        </div>
        <Field label="Monto del abono">
          <StitchCurrencyInput value={amount} onChange={setAmount} className={inputCls} autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-md">
          <Field label="Fecha"><StitchDatePicker value={date} onChange={setDate} max={todayISO()} /></Field>
          <Field label="Nota (opcional)"><input value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} placeholder="Ej. Pago al corte" /></Field>
        </div>
        <p className="font-mono-data text-mono-data text-text-muted normal-case tracking-normal">El abono liquida el saldo de la tarjeta; no es un gasto del presupuesto.</p>
        <FormActions onCancel={onClose} label="Registrar abono" disabled={!Number(amount)} />
      </form>
    </Modal>
  );
}
