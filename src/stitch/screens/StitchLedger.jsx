// Transacciones (Ledger) — layout Stitch con DATOS REALES + alta/edición/borrado.
import { useState, useMemo } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import toast from 'react-hot-toast';
import MS from '../MS';
import Emoji from '../Emoji';
import StitchCategorySelect from '../StitchCategorySelect';
import StitchSelect from '../StitchSelect';
import StitchDatePicker from '../StitchDatePicker';
import StitchCurrencyInput from '../StitchCurrencyInput';
import AutoCatChip from '../AutoCatChip';
import {
  isDemoActive, demoAddTransaction, demoUpdateTransaction, demoDeleteTransaction, demoRestoreTransaction,
  demoBulkDeleteTransactions, demoRestoreManyTransactions, demoBulkAssignCategory, demoBulkAssignCard,
} from '../demoMode';
import { EASE_OUT } from '../motionTokens';
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
const blank = { date: todayISO(), amount: '', type: 'variable_expense', categoryId: '', cardId: '', description: '', notes: '', currency: 'DOP', isRecurring: false, recurrencePattern: 'monthly' };

export default function StitchLedger() {
  const {
    transactions, addTransaction, updateTransaction, deleteTransaction, restoreTransaction,
    bulkDeleteTransactions, restoreManyTransactions, bulkAssignCategory, bulkAssignCard,
  } = useTransactionStore();
  const { categories } = useCategoryStore();
  const { cards } = useCreditCardStore();
  const addRecurring = useRecurringStore((s) => s.addRecurring);
  const fxRate = useRateStore((s) => s.getRate());

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [errors, setErrors] = useState({});
  const [autoCat, setAutoCat] = useState(false); // ¿la categoría se asignó automáticamente?
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortKey, setSortKey] = useState('date'); // 'date' | 'amount'
  const [sortDir, setSortDir] = useState('desc'); // 'asc' | 'desc'

  // Selección múltiple (ids). La barra de acciones aparece cuando hay ≥1.
  const [selected, setSelected] = useState(() => new Set());

  // Render de la categoría con su emoji JoyPixels + nombre.
  const catCell = (id) => {
    const c = categories.find((x) => x.id === id);
    if (!c) return '—';
    return <span className="inline-flex items-center gap-xs"><Emoji e={c.icon} size={16} />{c.name}</span>;
  };

  // ¿Es un gasto? (fijo o variable). El cashback y la tarjeta solo aplican a gastos.
  const isExpenseType = (t) => t === 'expense' || t === 'fixed_expense' || t === 'variable_expense';

  const cashbackPreview = useMemo(() => {
    if (!form.cardId || !isExpenseType(form.type)) return 0;
    const card = cards.find((c) => c.id === form.cardId);
    const base = form.currency === 'USD' ? Number(form.amount) * fxRate : Number(form.amount);
    return computeCashback(card, form.categoryId, base);
  }, [form, cards, fxRate]);

  // El tipo de una transacción se DERIVA de su categoría: la categoría ya sabe
  // si es ingreso, gasto fijo, gasto variable o ahorro (eso es lo que el motor
  // de presupuesto base-cero usa). Por eso no se elige "Tipo" a mano.
  const typeOfCategory = (id) => categories.find((c) => c.id === id)?.type || 'variable_expense';

  const onDescription = (description) => {
    setForm((prev) => {
      const u = { ...prev, description };
      // Matcheo inteligente: solo auto-asigna si el usuario no eligió categoría
      // manualmente (o si la actual ya era automática). No pisa una elección manual.
      if (!editing && (autoCat || !prev.categoryId)) {
        const sug = autoCategorize(description, categories);
        if (sug) {
          u.categoryId = sug.id;
          u.type = sug.type; // el tipo lo manda la categoría
          setAutoCat(true);
        }
      }
      return u;
    });
  };

  // Cambio manual de categoría: apaga "auto" y deriva el tipo de la categoría.
  const onCategoryManual = (id) => {
    setAutoCat(false);
    setForm((f) => ({ ...f, categoryId: id, type: id ? typeOfCategory(id) : f.type }));
  };

  const openCreate = () => { setForm(blank); setEditing(null); setErrors({}); setAutoCat(false); setShowForm(true); };
  const openEdit = (t) => { setForm({ ...blank, ...t, amount: String(t.amount) }); setEditing(t.id); setErrors({}); setAutoCat(false); setShowForm(true); };

  const demo = isDemoActive();

  const submit = async (e) => {
    e.preventDefault();
    const err = {};
    if (!form.date) err.date = '1';
    if (!form.amount || Number(form.amount) <= 0) err.amount = '1';
    if (!form.categoryId) err.categoryId = '1';
    if (Object.keys(err).length) { setErrors(err); return; }

    const description = titleCase(form.description);
    const data = { ...form, description, amount: Number(form.amount), cashbackEarned: cashbackPreview };

    if (editing) {
      if (demo) demoUpdateTransaction(editing, data); else await updateTransaction(editing, data);
      toast.success('Transacción actualizada');
    } else {
      if (demo) demoAddTransaction(data); else await addTransaction(data);
      if (form.isRecurring && !demo) {
        addRecurring({
          categoryId: form.categoryId, cardId: form.cardId, amount: Number(form.amount), type: form.type,
          description, notes: form.notes, currency: form.currency, frequency: form.recurrencePattern,
          nextDate: advanceDate(form.date, form.recurrencePattern),
        });
      }
      // El store ya muestra "Transacción guardada exitosamente" con login real;
      // en demo lo mostramos aquí (no hay backend que avise).
      if (demo) toast.success('Transacción guardada');
    }
    setShowForm(false); setForm(blank); setEditing(null); setAutoCat(false);
  };

  const onDelete = async (t) => {
    if (demo) {
      demoDeleteTransaction(t.id);
      toast((tt) => (
        <span className="flex items-center gap-sm">Transacción eliminada
          <button onClick={() => { demoRestoreTransaction(t); toast.dismiss(tt.id); }} className="text-primary font-bold underline">Deshacer</button>
        </span>
      ), { duration: 6000 });
      return;
    }
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
    if (dateFrom) r = r.filter((t) => t.date >= dateFrom);
    if (dateTo) r = r.filter((t) => t.date <= dateTo);
    const dir = sortDir === 'asc' ? 1 : -1;
    return r.sort((a, b) => {
      let cmp;
      if (sortKey === 'amount') cmp = Math.abs(Number(a.amount)) - Math.abs(Number(b.amount));
      else cmp = a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
      // Desempate estable por fecha cuando se ordena por monto.
      if (cmp === 0 && sortKey === 'amount') cmp = a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
      return cmp * dir;
    });
  }, [transactions, search, filterType, filterCat, dateFrom, dateTo, sortKey, sortDir]);

  // Click en encabezado: si ya ordena por esa columna, alterna asc/desc; si no,
  // cambia de columna (fechas arrancan desc = más reciente, monto desc = mayor).
  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
  };

  const hasFilters = search || filterType || filterCat || dateFrom || dateTo;
  const clearFilters = () => { setSearch(''); setFilterType(''); setFilterCat(''); setDateFrom(''); setDateTo(''); };

  // ── Selección múltiple ──────────────────────────────────────────────────────
  // La selección efectiva se DERIVA en render como la intersección entre lo
  // marcado y lo visible (filtrado). Así, al cambiar los filtros, las filas
  // ocultas dejan de contar automáticamente sin tocar estado en un effect
  // (evita cascading renders). El Set `selected` puede contener ids "rezagados"
  // de filas ocultas; se ignoran al derivar y al ejecutar acciones.
  const filteredIds = useMemo(() => filtered.map((t) => t.id), [filtered]);
  const visibleSelectedIds = useMemo(
    () => filteredIds.filter((id) => selected.has(id)),
    [filteredIds, selected],
  );
  const isSelected = (id) => selected.has(id);

  const selectedCount = visibleSelectedIds.length;
  const allVisibleSelected = filteredIds.length > 0 && selectedCount === filteredIds.length;
  const someVisibleSelected = selectedCount > 0 && !allVisibleSelected;

  const toggleOne = (id) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const toggleAll = () => setSelected((prev) => {
    if (filteredIds.every((id) => prev.has(id))) return new Set(); // todas marcadas → desmarca todo
    return new Set(filteredIds); // marca todo lo filtrado
  });
  const clearSelection = () => setSelected(new Set());

  // Acciones en bloque. La lógica (recalculo de cashback, persistencia) vive en
  // el store; aquí solo se orquesta + UI/toasts. En demo se usan los mutadores
  // locales equivalentes. Solo se actúa sobre ids visibles (la intersección).
  const selectedIds = () => visibleSelectedIds;

  const onBulkCategory = async (categoryId) => {
    const ids = selectedIds();
    if (demo) demoBulkAssignCategory(ids, categoryId);
    else await bulkAssignCategory(ids, categoryId);
    if (demo) toast.success('Categorías actualizadas');
    clearSelection();
  };
  const onBulkCard = async (cardId) => {
    const ids = selectedIds();
    if (demo) demoBulkAssignCard(ids, cardId);
    else await bulkAssignCard(ids, cardId);
    if (demo) toast.success('Transacciones actualizadas');
    clearSelection();
  };
  const onBulkDelete = async () => {
    const ids = selectedIds();
    const removed = demo ? demoBulkDeleteTransactions(ids) : await bulkDeleteTransactions(ids);
    clearSelection();
    if (removed && removed.length > 0) {
      const n = removed.length;
      toast((tt) => (
        <span className="flex items-center gap-sm">{n} transacción{n === 1 ? '' : 'es'} eliminada{n === 1 ? '' : 's'}
          <button
            onClick={() => { if (demo) demoRestoreManyTransactions(removed); else restoreManyTransactions(removed); toast.dismiss(tt.id); }}
            className="text-primary font-bold underline"
          >Deshacer</button>
        </span>
      ), { duration: 6000 });
    }
  };


  return (
    <div className="p-md sm:p-margin-safe max-w-[1728px] mx-auto w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-xl gap-md">
        <div>
          <h2 className="font-headline-lg text-headline-lg font-bold text-on-surface">Transacciones</h2>
          <p className="font-mono-data text-mono-data text-text-muted mt-sm uppercase">
            {transactions.length} registros · Sincronizado
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary ml-xs status-glow-live align-middle" />
          </p>
        </div>
        <button data-tour="ledger-new" onClick={openCreate} className="bg-primary text-on-primary font-label-sm text-label-sm uppercase tracking-widest font-bold px-md py-sm rounded hover:bg-primary-container transition-colors inner-glow flex items-center gap-xs">
          <MS name="add" className="text-[16px]" /> Nueva transacción
        </button>
      </div>

      {/* Filtros */}
      <div data-tour="ledger-filters" className="bg-surface-container-lowest border border-border-subtle rounded-lg p-sm mb-lg flex flex-wrap gap-sm items-center inner-glow">
        <div className="relative flex-1 min-w-[200px]">
          <MS name="search" className="absolute left-sm top-1/2 -translate-y-1/2 text-text-muted !text-[14px]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar descripción o notas…" className="w-full h-[34px] bg-surface-container border border-border-subtle rounded py-0 pl-[28px] pr-sm font-label-sm text-label-sm text-on-surface focus:outline-none focus:border-primary inner-glow placeholder:text-text-muted" />
        </div>
        <StitchSelect
          value={filterType}
          onChange={setFilterType}
          options={[{ value: '', label: 'Todos los tipos' }, ...TYPES.map((t) => ({ value: t.v, label: t.l }))]}
          placeholder="Todos los tipos"
          compact
          className="min-w-[150px]"
        />
        <StitchCategorySelect
          value={filterCat}
          onChange={setFilterCat}
          options={categories}
          includeAllOption
          allLabel="Todas las categorías"
          compact
          className="min-w-[200px]"
        />
        {/* Rango de fechas */}
        <div className="flex items-center gap-xs">
          <span className="font-mono-data text-mono-data text-text-muted uppercase">Desde</span>
          <StitchDatePicker value={dateFrom} max={dateTo || undefined} onChange={setDateFrom} compact className="w-[150px]" />
          <span className="font-mono-data text-mono-data text-text-muted uppercase">Hasta</span>
          <StitchDatePicker value={dateTo} min={dateFrom || undefined} onChange={setDateTo} compact className="w-[150px]" />
        </div>
        {hasFilters && (
          <button onClick={clearFilters} className="flex items-center gap-xs font-mono-data text-mono-data uppercase text-text-muted hover:text-on-surface border border-border-subtle rounded px-sm py-xs hover:bg-surface-container-high transition-colors">
            <MS name="close" className="text-[14px]" /> Limpiar
          </button>
        )}
      </div>

      {/* Tabla */}
      <div data-tour="ledger-table" className="bg-surface-container-lowest border border-border-subtle rounded-lg overflow-x-auto inner-glow relative">
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
                <th className="py-sm pl-md pr-0 w-[1%] align-middle">
                  <input
                    type="checkbox"
                    className="stitch-check align-middle"
                    checked={allVisibleSelected}
                    ref={(el) => { if (el) el.indeterminate = someVisibleSelected; }}
                    onChange={toggleAll}
                    aria-label="Seleccionar todas las transacciones visibles"
                  />
                </th>
                <th className="py-sm px-md font-mono-data text-mono-data text-text-muted uppercase font-normal">
                  <SortHeader label="Fecha" active={sortKey === 'date'} dir={sortDir} onClick={() => toggleSort('date')} />
                </th>
                <th className="py-sm px-md font-mono-data text-mono-data text-text-muted uppercase font-normal">Descripción</th>
                <th className="py-sm px-md font-mono-data text-mono-data text-text-muted uppercase font-normal">Categoría</th>
                <th className="py-sm px-md font-mono-data text-mono-data text-text-muted uppercase font-normal">Tipo</th>
                <th className="py-sm px-md font-mono-data text-mono-data text-text-muted uppercase font-normal text-right">
                  <SortHeader label="Monto" active={sortKey === 'amount'} dir={sortDir} onClick={() => toggleSort('amount')} alignRight />
                </th>
                <th className="py-sm px-md font-mono-data text-mono-data text-text-muted uppercase font-normal" />
              </tr>
            </thead>
            <tbody className="font-body-md text-body-md">
              {filtered.map((t) => {
                const inc = t.type === 'income';
                const isSel = isSelected(t.id);
                return (
                  <tr key={t.id} className={`border-b border-border-subtle transition-colors group ${isSel ? 'bg-primary/[0.06]' : 'hover:bg-surface-container-high'}`}>
                    <td className="py-sm pl-md pr-0 w-[1%] align-middle">
                      <input
                        type="checkbox"
                        className={`stitch-check align-middle transition-opacity ${isSel ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100'}`}
                        checked={isSel}
                        onChange={() => toggleOne(t.id)}
                        aria-label={`Seleccionar transacción ${t.description || formatDate(t.date)}`}
                      />
                    </td>
                    <td className="py-sm px-md text-on-surface-variant whitespace-nowrap font-mono-data text-mono-data">{formatDate(t.date)}</td>
                    <td className="py-sm px-md">
                      <div className="text-on-surface font-medium">{t.description || '—'}</div>
                      {t.notes && <div className="font-mono-data text-mono-data text-text-muted mt-0.5">{t.notes}</div>}
                    </td>
                    <td className="py-sm px-md text-on-surface-variant">{catCell(t.categoryId)}</td>
                    <td className="py-sm px-md">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm bg-surface-container-high border border-border-subtle font-mono-data text-[9px] text-on-surface-variant uppercase tracking-wider whitespace-nowrap">{getTypeLabel(t.type)}</span>
                    </td>
                    <td className={`py-sm px-md text-right font-mono-data tabular-nums whitespace-nowrap ${inc ? 'text-tertiary' : 'text-on-surface'}`}>
                      {inc ? '+' : '−'}{fmt(Math.abs(Number(t.amount)), t.currency)}
                      {Number(t.cashbackEarned) > 0 && (
                        <span className="block font-mono-data text-[9px] text-tertiary">cashback +{fmt(Number(t.cashbackEarned))}</span>
                      )}
                    </td>
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
                <StitchDatePicker value={form.date} onChange={(v) => setForm({ ...form, date: v })} />
              </Field>
              <Field label="Monto" error={errors.amount}>
                <StitchCurrencyInput value={form.amount} onChange={(v) => setForm({ ...form, amount: v })} className={inputCls} />
              </Field>
            </div>
            <Field label="Descripción">
              <input value={form.description} onChange={(e) => onDescription(e.target.value)} placeholder="Ej. Supermercado Nacional" className={inputCls} />
            </Field>
            <div className="grid grid-cols-2 gap-md">
              <Field label="Categoría" error={errors.categoryId} extra={<AutoCatChip show={autoCat && !!form.categoryId} />}>
                <StitchCategorySelect
                  value={form.categoryId}
                  onChange={onCategoryManual}
                  options={categories}
                  placeholder="Elige una categoría…"
                />
              </Field>
              <Field label="Moneda">
                <StitchSelect
                  value={form.currency}
                  onChange={(v) => setForm({ ...form, currency: v })}
                  options={[{ value: 'DOP', label: 'RD$ (DOP)' }, { value: 'USD', label: 'US$ (USD)' }]}
                />
              </Field>
            </div>
            {/* Tipo: derivado de la categoría (no editable). La categoría ya sabe si
                es ingreso, gasto fijo, gasto variable o ahorro; clasificar a mano
                era redundante. Se muestra como badge para dar claridad. */}
            <Field label="Tipo (según la categoría)">
              <TypeBadge type={form.type} hasCategory={!!form.categoryId} />
            </Field>
            {isExpenseType(form.type) && cards.length > 0 && (
              <Field label="Tarjeta (opcional)">
                <StitchSelect
                  value={form.cardId}
                  onChange={(v) => setForm({ ...form, cardId: v })}
                  options={[{ value: '', label: 'Sin tarjeta' }, ...cards.map((c) => ({ value: c.id, label: c.name }))]}
                  placeholder="Sin tarjeta"
                />
              </Field>
            )}
            {cashbackPreview > 0 && <p className="font-mono-data text-mono-data text-tertiary">Cashback estimado: +{fmt(cashbackPreview)}</p>}
            {!editing && (
              <label className="flex items-center gap-sm cursor-pointer">
                <input type="checkbox" checked={form.isRecurring} onChange={(e) => setForm({ ...form, isRecurring: e.target.checked })} className="stitch-check" />
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

      {/* Barra contextual flotante de acciones en bloque */}
      <BulkBar
        count={selectedCount}
        categories={categories}
        cards={cards}
        onCategory={onBulkCategory}
        onCard={onBulkCard}
        onDelete={onBulkDelete}
        onClear={clearSelection}
      />
    </div>
  );
}

// Barra flotante (abajo-centro) que aparece al seleccionar ≥1 transacción.
// Entra con spring (Emil: marketing/feedback puede tener delight contenido),
// sale más rápido. Respeta reduced-motion. Categoría/Tarjeta abren un popover
// inline para elegir destino; al confirmar disparan la acción y se cierran.
function BulkBar({ count, categories, cards, onCategory, onCard, onDelete, onClear }) {
  const reduce = useReducedMotion();
  const [menu, setMenu] = useState(null); // 'category' | 'card' | null
  const open = count > 0;

  // Cuando la barra desaparece (selección a 0), el popover ya no aplica. En vez
  // de un effect (cascading render), se deriva en render: si está cerrado, el
  // menú efectivo es null. Así no hace falta sincronizar estado.
  const activeMenu = open ? menu : null;

  const variants = reduce
    ? { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.15 } }, exit: { opacity: 0, transition: { duration: 0.1 } } }
    : {
        hidden: { opacity: 0, y: 16, scale: 0.98 },
        show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 320, damping: 28 } },
        exit: { opacity: 0, y: 12, scale: 0.98, transition: { duration: 0.14, ease: EASE_OUT } },
      };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          variants={variants}
          initial="hidden"
          animate="show"
          exit="exit"
          className="fixed bottom-lg left-1/2 -translate-x-1/2 z-40 w-[calc(100%-32px)] max-w-[560px]"
        >
          <div className="glass-panel rounded-lg inner-glow shadow-2xl px-md py-sm flex items-center gap-sm relative">
            {/* Conteo */}
            <span className="font-mono-data text-mono-data text-on-surface uppercase tracking-widest whitespace-nowrap">
              {count} seleccionada{count === 1 ? '' : 's'}
            </span>
            <span className="w-px h-5 bg-border-subtle mx-xs" />

            {/* Acciones */}
            <button
              onClick={() => setMenu((m) => (m === 'category' ? null : 'category'))}
              className={`flex items-center gap-xs font-label-sm text-label-sm rounded px-sm py-xs transition-colors ${activeMenu === 'category' ? 'bg-surface-container-high text-on-surface' : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'}`}
            >
              <MS name="sell" className="!text-[16px]" /> Categoría
            </button>
            <button
              onClick={() => setMenu((m) => (m === 'card' ? null : 'card'))}
              className={`flex items-center gap-xs font-label-sm text-label-sm rounded px-sm py-xs transition-colors ${activeMenu === 'card' ? 'bg-surface-container-high text-on-surface' : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'}`}
            >
              <MS name="credit_card" className="!text-[16px]" /> Tarjeta
            </button>
            <button
              onClick={onDelete}
              className="flex items-center gap-xs font-label-sm text-label-sm rounded px-sm py-xs text-accent-error hover:bg-accent-error/10 transition-colors"
            >
              <MS name="delete" className="!text-[16px]" /> Eliminar
            </button>

            <span className="flex-1" />
            <button onClick={onClear} aria-label="Limpiar selección" className="text-text-muted hover:text-on-surface p-xs rounded hover:bg-surface-container-high transition-colors">
              <MS name="close" className="!text-[18px]" />
            </button>

            {/* Popover de elección (categoría / tarjeta) */}
            <AnimatePresence>
              {activeMenu && (
                <motion.div
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
                  animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 360, damping: 30 } }}
                  exit={{ opacity: 0, transition: { duration: 0.12 } }}
                  style={{ transformOrigin: 'bottom left' }}
                  className="absolute bottom-full left-0 mb-sm w-[280px] bg-surface-card border border-border-subtle rounded-lg inner-glow shadow-xl p-sm max-h-[300px] overflow-y-auto stitch-scroll"
                >
                  <div className="font-mono-data text-mono-data text-text-muted uppercase tracking-widest px-sm py-xs">
                    {activeMenu === 'category' ? 'Mover a categoría' : 'Asignar tarjeta'}
                  </div>
                  {activeMenu === 'card' && (
                    <button
                      onClick={() => { onCard(''); setMenu(null); }}
                      className="w-full text-left flex items-center gap-sm px-sm py-sm rounded font-body-md text-body-md text-on-surface-variant hover:bg-surface-container-high transition-colors"
                    >
                      <MS name="block" className="!text-[16px] text-text-muted" /> Sin tarjeta
                    </button>
                  )}
                  {activeMenu === 'category'
                    ? categories.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => { onCategory(c.id); setMenu(null); }}
                          className="w-full text-left flex items-center gap-sm px-sm py-sm rounded font-body-md text-body-md text-on-surface hover:bg-surface-container-high transition-colors"
                        >
                          <Emoji e={c.icon} size={16} /> <span className="truncate">{c.name}</span>
                        </button>
                      ))
                    : cards.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => { onCard(c.id); setMenu(null); }}
                          className="w-full text-left flex items-center gap-sm px-sm py-sm rounded font-body-md text-body-md text-on-surface hover:bg-surface-container-high transition-colors"
                        >
                          <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: c.color || '#bec2ff' }} />
                          <span className="truncate">{c.name}</span>
                        </button>
                      ))}
                  {activeMenu === 'card' && cards.length === 0 && (
                    <div className="px-sm py-sm font-label-sm text-label-sm text-text-muted">No tienes tarjetas registradas.</div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const inputCls = 'w-full bg-surface-container-lowest border border-border-subtle rounded py-sm px-md font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary inner-glow';

// Badge de solo lectura del tipo derivado de la categoría. Color por tipo,
// alineado con los tokens del tema (lima=ingreso, durazno=fijo, periwinkle=
// variable, cian=ahorro).
const TYPE_META = {
  income: { label: 'Ingreso', icon: 'trending_up', cls: 'text-tertiary border-tertiary/40' },
  fixed_expense: { label: 'Gasto fijo', icon: 'event_repeat', cls: 'text-accent-warning border-accent-warning/40' },
  variable_expense: { label: 'Gasto variable', icon: 'shopping_cart', cls: 'text-primary border-primary/40' },
  expense: { label: 'Gasto', icon: 'payments', cls: 'text-on-surface-variant border-border-subtle' },
  savings: { label: 'Ahorro', icon: 'savings', cls: 'text-secondary border-secondary/40' },
};
function TypeBadge({ type, hasCategory }) {
  if (!hasCategory) {
    return <span className="font-label-sm text-label-sm text-text-muted italic">Elige una categoría primero</span>;
  }
  const m = TYPE_META[type] || TYPE_META.variable_expense;
  return (
    <span className={`inline-flex items-center gap-[3px] self-start font-mono-data text-[9px] uppercase tracking-wider font-medium border rounded-full px-[6px] py-[2px] leading-none ${m.cls}`}>
      <MS name={m.icon} className="!text-[11px] leading-none" />
      {m.label}
    </span>
  );
}

// Encabezado de columna ordenable. Muestra la flecha (asc/desc) solo cuando esa
// columna está activa; inactiva muestra un ícono tenue de "ordenable". Colores
// del tema (primary cuando activo). Estilo Stitch.
function SortHeader({ label, active, dir, onClick, alignRight = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={`Ordenar por ${label.toLowerCase()}`}
      className={`inline-flex items-center gap-[3px] font-mono-data text-mono-data uppercase tracking-wider transition-colors ${
        alignRight ? 'flex-row-reverse' : ''
      } ${active ? 'text-primary' : 'text-text-muted hover:text-on-surface-variant'}`}
    >
      {label}
      <MS
        name={active ? (dir === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
        className={`!text-[13px] leading-none ${active ? 'text-primary' : 'text-text-muted/60'}`}
      />
    </button>
  );
}

function Field({ label, error, extra, children }) {
  return (
    <div className="flex flex-col gap-xs">
      <label className="font-mono-data text-mono-data text-text-muted uppercase flex items-center gap-sm">
        {label}{extra}
      </label>
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
