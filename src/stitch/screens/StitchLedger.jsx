// Transacciones (Ledger) — layout Stitch con DATOS REALES + alta/edición/borrado.
import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import MS from '../MS';
import useTransactionStore from '../../stores/useTransactionStore';
import useCategoryStore from '../../stores/useCategoryStore';
import useCreditCardStore from '../../stores/useCreditCardStore';
import useRecurringStore, { advanceDate } from '../../stores/useRecurringStore';
import useRateStore from '../../stores/useRateStore';
import { computeCashback } from '../../utils/creditCards';
import { autoCategorize } from '../../data/defaultCategories';
import { formatCurrency, formatDate, todayISO, titleCase, getTypeLabel } from '../../utils/formatters';

const fmt = (n, c) => formatCurrency(n, c);
const TYPES = [
  { v: 'income', l: 'Ingreso' }, { v: 'expense', l: 'Gasto' },
  { v: 'fixed_expense', l: 'Gasto fijo' }, { v: 'variable_expense', l: 'Gasto variable' },
  { v: 'savings', l: 'Ahorro' },
];
const blank = { date: todayISO(), amount: '', type: 'expense', categoryId: '', cardId: '', description: '', notes: '', currency: 'DOP', isRecurring: false, recurrencePattern: 'monthly' };

export default function StitchLedger() {
  const { transactions, addTransaction, updateTransaction, deleteTransaction, restoreTransaction } = useTransactionStore();
  const { categories } = useCategoryStore();
  const { cards } = useCreditCardStore();
  const addRecurring = useRecurringStore((s) => s.addRecurring);
  const fxRate = useRateStore((s) => s.getRate());

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [errors, setErrors] = useState({});
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterCat, setFilterCat] = useState('');

  const catName = (id) => { const c = categories.find((x) => x.id === id); return c ? `${c.icon} ${c.name}` : '—'; };

  const cashbackPreview = useMemo(() => {
    if (!form.cardId || form.type !== 'expense') return 0;
    const card = cards.find((c) => c.id === form.cardId);
    const base = form.currency === 'USD' ? Number(form.amount) * fxRate : Number(form.amount);
    return computeCashback(card, form.categoryId, base);
  }, [form, cards, fxRate]);

  const onDescription = (description) => {
    setForm((prev) => {
      const u = { ...prev, description };
      if (!editing) {
        const sug = autoCategorize(description, categories);
        if (sug) {
          u.categoryId = sug.id;
          u.type = sug.type === 'income' ? 'income' : sug.type === 'savings' ? 'savings' : 'expense';
        }
      }
      return u;
    });
  };

  const openCreate = () => { setForm(blank); setEditing(null); setErrors({}); setShowForm(true); };
  const openEdit = (t) => { setForm({ ...blank, ...t, amount: String(t.amount) }); setEditing(t.id); setErrors({}); setShowForm(true); };

  const submit = (e) => {
    e.preventDefault();
    const err = {};
    if (!form.date) err.date = '1';
    if (!form.amount || Number(form.amount) <= 0) err.amount = '1';
    if (!form.categoryId) err.categoryId = '1';
    if (Object.keys(err).length) { setErrors(err); return; }

    const description = titleCase(form.description);
    const data = { ...form, description, amount: Number(form.amount), cashbackEarned: cashbackPreview };
    if (editing) { updateTransaction(editing, data); }
    else {
      addTransaction(data);
      if (form.isRecurring) {
        addRecurring({
          categoryId: form.categoryId, cardId: form.cardId, amount: Number(form.amount), type: form.type,
          description, notes: form.notes, currency: form.currency, frequency: form.recurrencePattern,
          nextDate: advanceDate(form.date, form.recurrencePattern),
        });
      }
    }
    setShowForm(false); setForm(blank); setEditing(null);
  };

  const onDelete = async (t) => {
    const ok = await deleteTransaction(t.id);
    if (ok) toast((tt) => (
      <span className="flex items-center gap-sm">Transacción eliminada
        <button onClick={() => { restoreTransaction(t); toast.dismiss(tt.id); }} className="text-primary font-bold underline">Deshacer</button>
      </span>
    ), { duration: 6000 });
  };

  const filtered = useMemo(() => {
    let r = [...transactions];
    if (search) { const q = search.toLowerCase(); r = r.filter((t) => t.description?.toLowerCase().includes(q) || t.notes?.toLowerCase().includes(q)); }
    if (filterType) r = r.filter((t) => t.type === filterType);
    if (filterCat) r = r.filter((t) => t.categoryId === filterCat);
    return r.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }, [transactions, search, filterType, filterCat]);

  const selectCls = 'appearance-none bg-surface-container border border-border-subtle text-on-surface font-label-sm text-label-sm py-xs pl-sm pr-[28px] rounded hover:border-outline-variant focus:outline-none focus:border-primary cursor-pointer inner-glow';

  return (
    <div className="p-margin-safe max-w-[1728px] mx-auto w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-xl gap-md">
        <div>
          <h2 className="font-headline-lg text-headline-lg font-bold text-on-surface">Transacciones</h2>
          <p className="font-mono-data text-mono-data text-text-muted mt-sm uppercase">
            {transactions.length} registros · Sincronizado
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary ml-xs status-glow-live align-middle" />
          </p>
        </div>
        <button onClick={openCreate} className="bg-primary text-on-primary font-label-sm text-label-sm uppercase tracking-widest font-bold px-md py-sm rounded hover:bg-primary-container transition-colors inner-glow flex items-center gap-xs">
          <MS name="add" className="text-[16px]" /> Nueva transacción
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-surface-container-lowest border border-border-subtle rounded-lg p-sm mb-lg flex flex-wrap gap-sm items-center inner-glow">
        <div className="relative flex-1 min-w-[200px]">
          <MS name="search" className="absolute left-sm top-1/2 -translate-y-1/2 text-text-muted text-[16px]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar descripción o notas…" className="w-full bg-surface-container border border-border-subtle rounded py-xs pl-[30px] pr-sm font-label-sm text-label-sm text-on-surface focus:outline-none focus:border-primary inner-glow placeholder:text-text-muted" />
        </div>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className={selectCls}>
          <option value="">Todos los tipos</option>
          {TYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
        </select>
        <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)} className={selectCls}>
          <option value="">Todas las categorías</option>
          {categories.filter((c) => c.isActive).map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-surface-container-lowest border border-border-subtle rounded-lg overflow-x-auto inner-glow relative">
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '16px 16px' }} />
        {filtered.length === 0 ? (
          <div className="relative z-10 py-[80px] flex flex-col items-center gap-sm text-center">
            <MS name="receipt_long" className="text-[36px] text-text-muted" />
            <p className="font-body-md text-body-md text-on-surface-variant">{transactions.length === 0 ? 'Aún no tienes transacciones.' : 'Sin resultados con esos filtros.'}</p>
            {transactions.length === 0 && <button onClick={openCreate} className="mt-sm bg-primary text-on-primary font-label-sm text-label-sm uppercase tracking-widest px-md py-sm rounded">Registrar la primera</button>}
          </div>
        ) : (
          <table className="w-full text-left border-collapse relative z-10">
            <thead>
              <tr className="border-b border-border-subtle">
                {['Fecha', 'Descripción', 'Categoría', 'Tipo', 'Monto', ''].map((h, i) => (
                  <th key={i} className={`py-sm px-md font-mono-data text-mono-data text-text-muted uppercase font-normal ${i === 4 ? 'text-right' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="font-body-md text-body-md">
              {filtered.map((t) => {
                const inc = t.type === 'income';
                return (
                  <tr key={t.id} className="border-b border-border-subtle hover:bg-surface-container-high transition-colors group">
                    <td className="py-sm px-md text-on-surface-variant whitespace-nowrap font-mono-data text-mono-data">{formatDate(t.date)}</td>
                    <td className="py-sm px-md">
                      <div className="text-on-surface font-medium">{t.description || '—'}</div>
                      {t.notes && <div className="font-mono-data text-mono-data text-text-muted mt-0.5">{t.notes}</div>}
                    </td>
                    <td className="py-sm px-md text-on-surface-variant">{catName(t.categoryId)}</td>
                    <td className="py-sm px-md">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm bg-surface-container-high border border-border-subtle font-mono-data text-[8px] text-on-surface-variant uppercase tracking-wider">{getTypeLabel(t.type)}</span>
                    </td>
                    <td className={`py-sm px-md text-right font-mono-data tabular-nums ${inc ? 'text-tertiary' : 'text-on-surface'}`}>{inc ? '+' : '−'}{fmt(Math.abs(Number(t.amount)), t.currency)}</td>
                    <td className="py-sm px-md text-right whitespace-nowrap">
                      <button onClick={() => openEdit(t)} className="text-text-muted hover:text-primary p-xs opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Editar"><MS name="edit" className="text-[16px]" /></button>
                      <button onClick={() => onDelete(t)} className="text-text-muted hover:text-accent-error p-xs opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Eliminar"><MS name="delete" className="text-[16px]" /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <Modal onClose={() => setShowForm(false)} title={editing ? 'Editar transacción' : 'Nueva transacción'}>
          <form onSubmit={submit} className="flex flex-col gap-md">
            <div className="grid grid-cols-2 gap-md">
              <Field label="Fecha" error={errors.date}>
                <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputCls} />
              </Field>
              <Field label="Monto" error={errors.amount}>
                <input inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value.replace(/[^0-9.]/g, '') })} placeholder="0.00" className={inputCls} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-md">
              <Field label="Tipo">
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputCls}>
                  {TYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
                </select>
              </Field>
              <Field label="Moneda">
                <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className={inputCls}>
                  <option value="DOP">RD$ (DOP)</option><option value="USD">US$ (USD)</option>
                </select>
              </Field>
            </div>
            <Field label="Descripción">
              <input value={form.description} onChange={(e) => onDescription(e.target.value)} placeholder="Ej. Supermercado Nacional" className={inputCls} />
            </Field>
            <Field label="Categoría" error={errors.categoryId}>
              <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className={inputCls}>
                <option value="">Elige una categoría…</option>
                {categories.filter((c) => c.isActive).map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </Field>
            {form.type === 'expense' && cards.length > 0 && (
              <Field label="Tarjeta (opcional)">
                <select value={form.cardId} onChange={(e) => setForm({ ...form, cardId: e.target.value })} className={inputCls}>
                  <option value="">Sin tarjeta</option>
                  {cards.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
            )}
            {cashbackPreview > 0 && <p className="font-mono-data text-mono-data text-tertiary">Cashback estimado: +{fmt(cashbackPreview)}</p>}
            {!editing && (
              <label className="flex items-center gap-sm cursor-pointer">
                <input type="checkbox" checked={form.isRecurring} onChange={(e) => setForm({ ...form, isRecurring: e.target.checked })} className="accent-[#bec2ff]" />
                <span className="font-label-sm text-label-sm text-on-surface-variant">Repetir automáticamente ({form.recurrencePattern === 'monthly' ? 'mensual' : form.recurrencePattern})</span>
              </label>
            )}
            <div className="flex gap-sm justify-end mt-sm">
              <button type="button" onClick={() => setShowForm(false)} className="px-md py-sm border border-border-subtle text-on-surface-variant font-label-sm text-label-sm rounded hover:bg-surface-container-high">Cancelar</button>
              <button type="submit" className="px-md py-sm bg-primary text-on-primary font-label-sm text-label-sm uppercase tracking-widest font-bold rounded hover:bg-primary-container inner-glow">{editing ? 'Guardar' : 'Registrar'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

const inputCls = 'w-full bg-surface-container-lowest border border-border-subtle rounded py-sm px-md font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary inner-glow';

function Field({ label, error, children }) {
  return (
    <div className="flex flex-col gap-xs">
      <label className="font-mono-data text-mono-data text-text-muted uppercase">{label}</label>
      {children}
      {error && <span className="font-label-sm text-label-sm text-accent-error">Requerido</span>}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-md" style={{ background: 'rgba(0,0,0,0.66)' }} onClick={onClose}>
      <div className="bg-surface-card border border-border-subtle rounded-lg inner-glow w-full max-w-[520px] max-h-[85vh] overflow-y-auto p-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-lg">
          <h3 className="font-headline-md text-[20px] font-bold text-on-surface tracking-tight">{title}</h3>
          <button onClick={onClose} className="text-text-muted hover:text-on-surface p-xs"><MS name="close" className="text-[20px]" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
