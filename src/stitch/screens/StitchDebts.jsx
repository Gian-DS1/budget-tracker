// Deudas — layout Stitch con DATOS REALES + pagos (addPayment crea tx enlazada).
import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import MS from '../MS';
import useDebtStore from '../../stores/useDebtStore';
import { formatCurrency, todayISO } from '../../utils/formatters';

const fmt = (n, c) => formatCurrency(n, c);
const blank = { creditorName: '', originalAmount: '', currentBalance: '', interestRate: '', monthlyPayment: '', dueDate: '', currency: 'DOP' };

export default function StitchDebts() {
  const { debts, addDebt, updateDebt, deleteDebt, addPayment } = useDebtStore();
  const getTotalDebt = useDebtStore((s) => s.getTotalDebt);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [payDebt, setPayDebt] = useState(null);
  const [payAmount, setPayAmount] = useState('');

  const active = debts.filter((d) => d.status === 'active');
  const totalDebt = getTotalDebt();

  // Estrategia avalancha: ordena por mayor interés (paga primero el más caro).
  const ordered = useMemo(() => [...active].sort((a, b) => Number(b.interestRate) - Number(a.interestRate)), [active]);

  const openCreate = () => { setForm(blank); setEditing(null); setShowForm(true); };
  const openEdit = (d) => { setForm({ creditorName: d.creditorName, originalAmount: String(d.originalAmount), currentBalance: String(d.currentBalance), interestRate: String(d.interestRate), monthlyPayment: String(d.monthlyPayment), dueDate: d.due_date || '', currency: d.currency || 'DOP' }); setEditing(d.id); setShowForm(true); };

  const submit = (e) => {
    e.preventDefault();
    if (!form.creditorName || !form.originalAmount) return;
    const data = {
      creditorName: form.creditorName, originalAmount: Number(form.originalAmount),
      currentBalance: Number(form.currentBalance || form.originalAmount), interestRate: Number(form.interestRate) || 0,
      monthlyPayment: Number(form.monthlyPayment) || 0, dueDate: form.dueDate || null, currency: form.currency,
    };
    if (editing) updateDebt(editing, data); else addDebt(data);
    setShowForm(false);
  };

  const submitPay = (e) => {
    e.preventDefault();
    const amt = parseFloat(payAmount);
    if (!payDebt || !amt || amt <= 0) return;
    addPayment(payDebt.id, amt, todayISO(), '');
    const newBal = Number(payDebt.currentBalance) - amt;
    toast.success(newBal <= 0 ? '🎉 ¡Deuda liquidada!' : `Pago de ${fmt(amt, payDebt.currency)} registrado`, { duration: 4000 });
    setPayDebt(null); setPayAmount('');
  };

  return (
    <div className="p-margin-safe max-w-[1728px] mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-lg mb-xl">
        <div>
          <div className="flex items-center gap-sm mb-xs">
            <span className="w-2 h-2 rounded-full bg-accent-error error-dot" />
            <span className="font-mono-data text-mono-data text-accent-error uppercase tracking-wider">Pasivos · estrategia avalancha</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Control de deudas</h1>
          <p className="font-body-md text-body-md text-text-muted mt-sm">Deuda total activa: <span className="text-accent-error font-mono-data">{fmt(totalDebt)}</span></p>
        </div>
        <button onClick={openCreate} className="bg-primary text-on-primary font-label-sm text-label-sm uppercase tracking-widest font-bold px-md py-sm rounded hover:bg-primary-container transition-colors inner-glow flex items-center gap-xs self-start">
          <MS name="add" className="text-[16px]" /> Nueva deuda
        </button>
      </div>

      {ordered.length === 0 ? (
        <div className="bg-surface-card border border-border-subtle rounded-lg inner-glow py-[60px] flex flex-col items-center gap-sm text-center">
          <MS name="celebration" className="text-[36px] text-tertiary" />
          <p className="font-body-md text-body-md text-on-surface-variant">Sin deudas activas. ¡Felicidades!</p>
          <button onClick={openCreate} className="mt-sm bg-primary text-on-primary font-label-sm text-label-sm uppercase tracking-widest px-md py-sm rounded">Registrar una deuda</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-md">
          {ordered.map((d, i) => {
            const paidPct = Number(d.originalAmount) > 0 ? (1 - Number(d.currentBalance) / Number(d.originalAmount)) * 100 : 0;
            const high = Number(d.interestRate) >= 8;
            return (
              <div key={d.id} className={`bg-surface-card border rounded-lg p-md inner-glow flex flex-col gap-md ${high ? 'border-accent-warning/30' : 'border-border-subtle'}`}>
                <div className="flex justify-between items-center">
                  <span className="font-label-sm text-label-sm uppercase text-on-surface flex items-center gap-xs">
                    {i === 0 && <span className="font-mono-data text-[8px] text-accent-error border border-accent-error/40 rounded px-1">PAGAR 1RO</span>}
                    {d.creditorName}
                  </span>
                  <span className={`font-mono-data text-mono-data ${high ? 'text-accent-warning' : 'text-text-muted'}`}>{Number(d.interestRate).toFixed(1)}% TNA</span>
                </div>
                <div className={`font-headline-md text-headline-md ${high ? 'text-accent-warning' : 'text-on-surface'}`}>{fmt(d.currentBalance, d.currency)}</div>
                <div className="w-full bg-surface-container-highest h-1 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, paidPct))}%` }} />
                </div>
                <div className="flex justify-between font-mono-data text-mono-data text-text-muted">
                  <span>Pagado {paidPct.toFixed(0)}%</span>
                  <span>Cuota {fmt(d.monthlyPayment, d.currency)}</span>
                </div>
                <div className="flex gap-sm mt-xs">
                  <button onClick={() => { setPayDebt(d); setPayAmount(String(d.monthlyPayment || '')); }} className="flex-1 border border-border-subtle text-primary font-mono-data text-mono-data uppercase py-xs rounded hover:bg-primary/10">Pagar cuota</button>
                  <button onClick={() => openEdit(d)} className="px-sm border border-border-subtle text-text-muted rounded hover:text-on-surface"><MS name="edit" className="text-[14px]" /></button>
                  <button onClick={() => deleteDebt(d.id)} className="px-sm border border-border-subtle text-text-muted rounded hover:text-accent-error"><MS name="delete" className="text-[14px]" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <Modal title={editing ? 'Editar deuda' : 'Nueva deuda'} onClose={() => setShowForm(false)}>
          <form onSubmit={submit} className="flex flex-col gap-md">
            <Field label="Acreedor"><input value={form.creditorName} onChange={(e) => setForm({ ...form, creditorName: e.target.value })} className={inputCls} placeholder="Ej. Banco Popular" /></Field>
            <div className="grid grid-cols-2 gap-md">
              <Field label="Monto original"><input inputMode="decimal" value={form.originalAmount} onChange={(e) => setForm({ ...form, originalAmount: e.target.value.replace(/[^0-9.]/g, '') })} className={inputCls} /></Field>
              <Field label="Saldo actual"><input inputMode="decimal" value={form.currentBalance} onChange={(e) => setForm({ ...form, currentBalance: e.target.value.replace(/[^0-9.]/g, '') })} className={inputCls} placeholder="= original" /></Field>
            </div>
            <div className="grid grid-cols-2 gap-md">
              <Field label="Interés % (TNA)"><input inputMode="decimal" value={form.interestRate} onChange={(e) => setForm({ ...form, interestRate: e.target.value.replace(/[^0-9.]/g, '') })} className={inputCls} /></Field>
              <Field label="Cuota mensual"><input inputMode="decimal" value={form.monthlyPayment} onChange={(e) => setForm({ ...form, monthlyPayment: e.target.value.replace(/[^0-9.]/g, '') })} className={inputCls} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-md">
              <Field label="Próximo pago"><input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className={inputCls} /></Field>
              <Field label="Moneda"><select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className={inputCls}><option value="DOP">RD$ (DOP)</option><option value="USD">US$ (USD)</option></select></Field>
            </div>
            <FormActions onCancel={() => setShowForm(false)} label={editing ? 'Guardar' : 'Registrar'} />
          </form>
        </Modal>
      )}

      {payDebt && (
        <Modal title={`Pagar · ${payDebt.creditorName}`} onClose={() => setPayDebt(null)}>
          <form onSubmit={submitPay} className="flex flex-col gap-md">
            <Field label="Monto del pago"><input inputMode="decimal" value={payAmount} onChange={(e) => setPayAmount(e.target.value.replace(/[^0-9.]/g, ''))} className={inputCls} autoFocus /></Field>
            <p className="font-mono-data text-mono-data text-text-muted">Se registra el pago y se crea una transacción de gasto enlazada automáticamente.</p>
            <FormActions onCancel={() => setPayDebt(null)} label="Registrar pago" />
          </form>
        </Modal>
      )}
    </div>
  );
}

const inputCls = 'w-full bg-surface-container-lowest border border-border-subtle rounded py-sm px-md font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary inner-glow';
function Field({ label, children }) { return <div className="flex flex-col gap-xs"><label className="font-mono-data text-mono-data text-text-muted uppercase">{label}</label>{children}</div>; }
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
