// Ahorros (Vaults) — layout Stitch con METAS REALES + aportes.
import { useState } from 'react';
import toast from 'react-hot-toast';
import MS from '../MS';
import { Stagger } from '../StitchMotion';
import useSavingsStore from '../../stores/useSavingsStore';
import useTransactionStore from '../../stores/useTransactionStore';
import { formatCurrency, todayISO } from '../../utils/formatters';

const fmt = (n, c) => formatCurrency(n, c);
const EMOJIS = ['🎯', '🏠', '✈️', '🚗', '💻', '📱', '👶', '🎓', '💍', '🆘', '🏖️', '🏦'];
const blank = { title: '', targetAmount: '', currentAmount: '0', deadline: '', icon: '🎯', color: '#bec2ff', currency: 'DOP' };

export default function StitchVaults() {
  const { goals, addGoal, updateGoal, deleteGoal, addContribution, getTotalSaved } = useSavingsStore();
  const { addTransaction } = useTransactionStore();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [contribGoal, setContribGoal] = useState(null);
  const [contribAmount, setContribAmount] = useState('');

  const total = getTotalSaved();

  const openCreate = () => { setForm(blank); setEditing(null); setShowForm(true); };
  const openEdit = (g) => { setForm({ title: g.title, targetAmount: String(g.targetAmount), currentAmount: String(g.currentAmount), deadline: g.deadline || '', icon: g.icon || '🎯', color: g.color || '#bec2ff', currency: g.currency || 'DOP' }); setEditing(g.id); setShowForm(true); };

  const submit = (e) => {
    e.preventDefault();
    if (!form.title || !form.targetAmount) return;
    const data = { ...form, targetAmount: Number(form.targetAmount), currentAmount: Number(form.currentAmount) || 0 };
    if (editing) { updateGoal(editing, data); toast.success('Meta actualizada'); }
    else { addGoal(data); toast.success('Meta creada'); }
    setShowForm(false);
  };

  const submitContrib = (e) => {
    e.preventDefault();
    const amt = parseFloat(contribAmount);
    if (!contribGoal || !amt || amt <= 0) return;
    addContribution(contribGoal.id, amt);
    addTransaction({ date: todayISO(), amount: amt, type: 'savings', categoryId: '', description: `Abono a meta: ${contribGoal.title}`, currency: contribGoal.currency || 'DOP' });
    const done = Number(contribGoal.currentAmount) + amt >= Number(contribGoal.targetAmount);
    toast.success(done ? '🎉 ¡Meta completada!' : `Abono de ${fmt(amt)} registrado`, { duration: 4000 });
    setContribGoal(null); setContribAmount('');
  };

  return (
    <div className="p-margin-safe pb-section-padding max-w-[1728px] mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-lg mb-xl">
        <div>
          <div className="flex items-center gap-2 mb-sm">
            <span className="w-2 h-2 rounded-full bg-tertiary live-dot" />
            <span className="font-mono-data text-mono-data text-tertiary uppercase tracking-wider">Sistema activo</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Metas de ahorro</h1>
          <p className="font-body-md text-body-md text-text-muted mt-2">Ahorro total acumulado: <span className="text-tertiary font-mono-data">{fmt(total)}</span></p>
        </div>
        <button onClick={openCreate} className="bg-primary text-on-primary font-label-sm text-label-sm uppercase tracking-widest font-bold px-md py-sm rounded hover:bg-primary-container transition-colors inner-glow flex items-center gap-xs self-start">
          <MS name="add" className="text-[16px]" /> Nueva meta
        </button>
      </div>

      {goals.length === 0 ? (
        <div className="bg-surface-card border border-border-subtle rounded-lg inner-glow py-[60px] flex flex-col items-center gap-sm text-center">
          <MS name="savings" className="text-[36px] text-text-muted" />
          <p className="font-body-md text-body-md text-on-surface-variant">Sin metas de ahorro todavía.</p>
          <button onClick={openCreate} className="mt-sm bg-primary text-on-primary font-label-sm text-label-sm uppercase tracking-widest px-md py-sm rounded">Crear primera meta</button>
        </div>
      ) : (
        <Stagger className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-md">
          {goals.map((g) => {
            const pct = Number(g.targetAmount) > 0 ? (Number(g.currentAmount) / Number(g.targetAmount)) * 100 : 0;
            const done = pct >= 100;
            return (
              <Stagger.Item key={g.id} className="bg-surface-card border border-border-subtle rounded-lg p-lg inner-glow relative overflow-hidden group hover:border-primary transition-colors" style={{ opacity: g.status === 'paused' ? 0.6 : 1 }}>
                <div className="absolute top-0 right-0 p-md flex gap-xs opacity-20 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(g)} className="text-text-muted hover:text-on-surface"><MS name="edit" className="text-[18px]" /></button>
                  <button onClick={() => deleteGoal(g.id)} className="text-text-muted hover:text-accent-error"><MS name="delete" className="text-[18px]" /></button>
                </div>
                <div className="flex items-center gap-sm mb-lg">
                  <div className="w-8 h-8 rounded-sm bg-surface-container-high flex items-center justify-center border border-border-subtle text-[18px]">{g.icon}</div>
                  <span className="font-mono-data text-mono-data text-on-surface uppercase">{g.title}</span>
                </div>
                <div className="mb-xl">
                  <div className="font-headline-md text-headline-md tracking-tight" style={{ color: done ? '#bdd200' : '#e5e2e3' }}>{fmt(g.currentAmount, g.currency)}</div>
                  <div className="font-label-sm text-label-sm text-text-muted mt-xs flex justify-between">
                    <span>Meta: {fmt(g.targetAmount, g.currency)}</span><span>{pct.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="w-full h-[2px] bg-surface-container-highest mb-md rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: done ? '#bdd200' : g.color }} />
                </div>
                <button onClick={() => { setContribGoal(g); setContribAmount(''); }} className="w-full border border-border-subtle text-primary font-mono-data text-mono-data uppercase py-xs rounded hover:bg-primary/10 transition-colors">
                  Abonar
                </button>
              </Stagger.Item>
            );
          })}
        </Stagger>
      )}

      {showForm && (
        <Modal title={editing ? 'Editar meta' : 'Nueva meta'} onClose={() => setShowForm(false)}>
          <form onSubmit={submit} className="flex flex-col gap-md">
            <Field label="Nombre"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} placeholder="Ej. Fondo de emergencia" /></Field>
            <div className="grid grid-cols-2 gap-md">
              <Field label="Meta"><input inputMode="decimal" value={form.targetAmount} onChange={(e) => setForm({ ...form, targetAmount: e.target.value.replace(/[^0-9.]/g, '') })} className={inputCls} /></Field>
              <Field label="Ahorrado"><input inputMode="decimal" value={form.currentAmount} onChange={(e) => setForm({ ...form, currentAmount: e.target.value.replace(/[^0-9.]/g, '') })} className={inputCls} /></Field>
            </div>
            <Field label="Fecha límite"><input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className={inputCls} /></Field>
            <Field label="Ícono">
              <div className="flex flex-wrap gap-xs">{EMOJIS.map((em) => <button type="button" key={em} onClick={() => setForm({ ...form, icon: em })} className={`w-8 h-8 rounded border text-[16px] ${form.icon === em ? 'border-primary bg-primary/10' : 'border-border-subtle'}`}>{em}</button>)}</div>
            </Field>
            <FormActions onCancel={() => setShowForm(false)} label={editing ? 'Guardar' : 'Crear'} />
          </form>
        </Modal>
      )}

      {contribGoal && (
        <Modal title={`Abonar · ${contribGoal.title}`} onClose={() => setContribGoal(null)}>
          <form onSubmit={submitContrib} className="flex flex-col gap-md">
            <Field label="Monto a abonar"><input inputMode="decimal" value={contribAmount} onChange={(e) => setContribAmount(e.target.value.replace(/[^0-9.]/g, ''))} className={inputCls} autoFocus /></Field>
            <p className="font-mono-data text-mono-data text-text-muted">Se suma a la meta y se registra como transacción de ahorro.</p>
            <FormActions onCancel={() => setContribGoal(null)} label="Abonar" />
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
