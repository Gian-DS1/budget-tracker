// Tarjetas — layout Stitch con SALDOS REALES (getCardBalances) + abonos.
import { useState, useMemo } from 'react';
import MS from '../MS';
import { Stagger } from '../StitchMotion';
import useCreditCardStore from '../../stores/useCreditCardStore';
import useTransactionStore from '../../stores/useTransactionStore';
import { getCardBalances, getLifetimeCashback } from '../../utils/creditCards';
import { formatCurrency, formatDate, todayISO } from '../../utils/formatters';

const fmt = (n) => formatCurrency(n);
const COLORS = ['#bec2ff', '#50d8e9', '#bdd200', '#ffb689', '#ffb4ab', '#9aa0ff', '#e9a0d8'];
const blank = { name: '', bank: '', cutoffDay: '', dueDay: '', color: '#bec2ff', cashbackRules: [], catalogId: null };

export default function StitchCards() {
  const { cards, addCard, updateCard, addCardPayment } = useCreditCardStore();
  const { transactions } = useTransactionStore();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [payCard, setPayCard] = useState(null);
  const [payAmount, setPayAmount] = useState('');

  const rows = useMemo(() => cards.map((card) => ({
    card,
    bal: getCardBalances(card, transactions, new Date()),
    cashback: getLifetimeCashback(card, transactions),
  })), [cards, transactions]);

  const openCreate = () => { setForm(blank); setEditing(null); setShowForm(true); };
  const openEdit = (c) => { setForm({ ...blank, ...c, cutoffDay: String(c.cutoffDay), dueDay: String(c.dueDay) }); setEditing(c.id); setShowForm(true); };

  const submit = (e) => {
    e.preventDefault();
    const cutoffDay = parseInt(form.cutoffDay, 10), dueDay = parseInt(form.dueDay, 10);
    if (!form.name || !(cutoffDay >= 1 && cutoffDay <= 31) || !(dueDay >= 1 && dueDay <= 31)) return;
    const payload = { name: form.name, bank: form.bank, cutoffDay, dueDay, color: form.color, cashbackRules: form.cashbackRules || [], catalogId: form.catalogId || null };
    if (editing) updateCard(editing, payload); else addCard(payload);
    setShowForm(false);
  };

  const submitPay = (e) => {
    e.preventDefault();
    const amt = parseFloat(payAmount);
    if (!payCard || !amt || amt <= 0) return;
    addCardPayment(payCard.id, { amount: amt, date: todayISO(), note: '' });
    setPayCard(null); setPayAmount('');
  };

  return (
    <div className="p-md sm:p-margin-safe max-w-[1728px] mx-auto w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-xl gap-md">
        <div>
          <div className="flex items-center gap-sm mb-xs">
            <span className="w-2 h-2 rounded-full bg-secondary live-dot" />
            <span className="font-mono-data text-mono-data text-secondary uppercase tracking-wider">Tarjetas activas</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Tarjetas de crédito</h1>
          <p className="font-body-md text-body-md text-text-muted mt-sm">Saldo facturado, ciclo abierto, fechas de corte y pago, cashback.</p>
        </div>
        <button onClick={openCreate} className="bg-primary text-on-primary font-label-sm text-label-sm uppercase tracking-widest font-bold px-md py-sm rounded hover:bg-primary-container transition-colors inner-glow flex items-center gap-xs">
          <MS name="add" className="text-[16px]" /> Nueva tarjeta
        </button>
      </div>

      {rows.length === 0 ? (
        <Empty onAdd={openCreate} />
      ) : (
        <Stagger className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-md">
          {rows.map(({ card, bal, cashback }) => (
            <Stagger.Item key={card.id} className="bg-surface-card rounded-xl p-lg border border-border-subtle inner-glow relative overflow-hidden group">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: `linear-gradient(135deg, ${card.color}11, transparent)` }} />
              <div className="flex justify-between items-start mb-lg relative z-10">
                <div className="flex items-center gap-sm">
                  <span className="w-2 h-2 rounded-full glow-dot" style={{ background: card.color, color: card.color }} />
                  <span className="font-label-sm text-label-sm uppercase text-on-surface">{card.name}</span>
                </div>
                <div className="flex gap-xs">
                  <button onClick={() => openEdit(card)} className="text-text-muted hover:text-primary"><MS name="edit" className="text-[16px]" /></button>
                  <span className="font-mono-data text-mono-data text-text-muted">{card.bank}</span>
                </div>
              </div>

              <div className="relative z-10 mb-md">
                <span className="font-mono-data text-mono-data text-text-muted">POR PAGAR</span>
                <div className={`font-headline-md text-headline-md tracking-tight ${bal.isPaid ? 'text-tertiary' : 'text-on-surface'}`}>
                  {bal.isPaid ? 'Al día' : fmt(bal.pendingBilled)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-sm relative z-10 mb-md font-mono-data text-mono-data">
                <div className="flex flex-col"><span className="text-text-muted">CICLO ABIERTO</span><span className="text-on-surface-variant mt-1">{fmt(bal.openCycle)}</span></div>
                <div className="flex flex-col text-right"><span className="text-text-muted">VENCE</span><span className="text-on-surface-variant mt-1">{formatDate(bal.cycles.dueDateISO)}</span></div>
                <div className="flex flex-col"><span className="text-text-muted">CORTE DÍA</span><span className="text-on-surface-variant mt-1">{card.cutoffDay}</span></div>
                <div className="flex flex-col text-right"><span className="text-text-muted">CASHBACK TOTAL</span><span className="text-tertiary mt-1">+{fmt(cashback)}</span></div>
              </div>

              <button onClick={() => { setPayCard(card); setPayAmount(bal.pendingBilled > 0 ? String(Math.round(bal.pendingBilled * 100) / 100) : ''); }} className="relative z-10 w-full mt-sm border border-border-subtle text-primary font-mono-data text-mono-data uppercase py-xs rounded hover:bg-primary/10 transition-colors">
                Registrar abono
              </button>
            </Stagger.Item>
          ))}
        </Stagger>
      )}

      {showForm && (
        <Modal title={editing ? 'Editar tarjeta' : 'Nueva tarjeta'} onClose={() => setShowForm(false)}>
          <form onSubmit={submit} className="flex flex-col gap-md">
            <Field label="Nombre"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="Ej. Visa Popular" /></Field>
            <Field label="Banco"><input value={form.bank} onChange={(e) => setForm({ ...form, bank: e.target.value })} className={inputCls} /></Field>
            <div className="grid grid-cols-2 gap-md">
              <Field label="Día de corte"><input inputMode="numeric" value={form.cutoffDay} onChange={(e) => setForm({ ...form, cutoffDay: e.target.value.replace(/\D/g, '') })} className={inputCls} placeholder="1-31" /></Field>
              <Field label="Día de pago"><input inputMode="numeric" value={form.dueDay} onChange={(e) => setForm({ ...form, dueDay: e.target.value.replace(/\D/g, '') })} className={inputCls} placeholder="1-31" /></Field>
            </div>
            <Field label="Color">
              <div className="flex gap-sm">{COLORS.map((c) => <button type="button" key={c} onClick={() => setForm({ ...form, color: c })} className={`w-7 h-7 rounded-full border-2 ${form.color === c ? 'border-on-surface' : 'border-transparent'}`} style={{ background: c }} />)}</div>
            </Field>
            <FormActions onCancel={() => setShowForm(false)} label={editing ? 'Guardar' : 'Crear'} />
          </form>
        </Modal>
      )}

      {payCard && (
        <Modal title={`Abono · ${payCard.name}`} onClose={() => setPayCard(null)}>
          <form onSubmit={submitPay} className="flex flex-col gap-md">
            <Field label="Monto del abono"><input inputMode="decimal" value={payAmount} onChange={(e) => setPayAmount(e.target.value.replace(/[^0-9.]/g, ''))} className={inputCls} placeholder="0.00" autoFocus /></Field>
            <p className="font-mono-data text-mono-data text-text-muted">El abono liquida el saldo de la tarjeta; no es un gasto del presupuesto.</p>
            <FormActions onCancel={() => setPayCard(null)} label="Registrar abono" />
          </form>
        </Modal>
      )}
    </div>
  );
}

const inputCls = 'w-full bg-surface-container-lowest border border-border-subtle rounded py-sm px-md font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary inner-glow';

function Field({ label, children }) {
  return <div className="flex flex-col gap-xs"><label className="font-mono-data text-mono-data text-text-muted uppercase">{label}</label>{children}</div>;
}
function FormActions({ onCancel, label }) {
  return (
    <div className="flex gap-sm justify-end mt-sm">
      <button type="button" onClick={onCancel} className="px-md py-sm border border-border-subtle text-on-surface-variant font-label-sm text-label-sm rounded hover:bg-surface-container-high">Cancelar</button>
      <button type="submit" className="px-md py-sm bg-primary text-on-primary font-label-sm text-label-sm uppercase tracking-widest font-bold rounded hover:bg-primary-container inner-glow">{label}</button>
    </div>
  );
}
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-md" style={{ background: 'rgba(0,0,0,0.66)' }} onClick={onClose}>
      <div className="bg-surface-card border border-border-subtle rounded-lg inner-glow w-full max-w-[480px] max-h-[85vh] overflow-y-auto p-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-lg">
          <h3 className="font-headline-md text-[20px] font-bold text-on-surface tracking-tight">{title}</h3>
          <button onClick={onClose} className="text-text-muted hover:text-on-surface p-xs"><MS name="close" className="text-[20px]" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
function Empty({ onAdd }) {
  return (
    <div className="bg-surface-card border border-border-subtle rounded-lg inner-glow py-[60px] flex flex-col items-center gap-sm text-center">
      <MS name="credit_card" className="text-[36px] text-text-muted" />
      <p className="font-body-md text-body-md text-on-surface-variant">Aún no tienes tarjetas.</p>
      <button onClick={onAdd} className="mt-sm bg-primary text-on-primary font-label-sm text-label-sm uppercase tracking-widest px-md py-sm rounded">Agregar tarjeta</button>
    </div>
  );
}
