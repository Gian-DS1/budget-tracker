// FinTrack RD — Transactions Page

import { useState, useMemo } from 'react';
import { Plus, X, Search, Filter, Trash2, ArrowLeftRight, ArrowUp, ArrowDown, ArrowUpDown, Edit3, Repeat, Play, Pause } from 'lucide-react';
import toast from 'react-hot-toast';
import useTransactionStore from '../stores/useTransactionStore';
import useCategoryStore from '../stores/useCategoryStore';
import useCreditCardStore from '../stores/useCreditCardStore';
import useRecurringStore, { advanceDate } from '../stores/useRecurringStore';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import CurrencyInput from '../components/ui/CurrencyInput';
import { SkeletonTable } from '../components/ui/Skeleton';
import { autoCategorize } from '../data/defaultCategories';
import { formatCurrency, formatDate, todayISO, getTypeBadgeClass, getTypeLabel, titleCase } from '../utils/formatters';
import useRateStore from '../stores/useRateStore';
import { computeCashback } from '../utils/creditCards';
import { usePageShortcuts } from '../hooks/useKeyboardShortcuts';

// Valor centinela del filtro de categoría para las transacciones SIN categoría
// (categoryId nulo o apuntando a una categoría que ya fue eliminada).
const UNCATEGORIZED = '__uncategorized__';

export default function TransactionsPage() {
  const { transactions, addTransaction, updateTransaction, deleteTransaction, restoreTransaction, bulkDeleteTransactions, restoreManyTransactions, bulkAssignCard, bulkAssignCategory } =
    useTransactionStore();
  const txLoading = useTransactionStore((s) => s.loading);
  // Solo mostramos esqueleto en carga en frío: cargando Y sin nada en caché. Si
  // ya hay datos (caché local), nunca los reemplazamos por placeholders.
  const showSkeleton = txLoading && transactions.length === 0;
  const { categories } = useCategoryStore();
  const { cards } = useCreditCardStore();
  const fxRate = useRateStore((s) => s.getRate());
  const recurring = useRecurringStore((s) => s.recurring);
  const addRecurring = useRecurringStore((s) => s.addRecurring);
  const toggleRecurring = useRecurringStore((s) => s.toggleActive);
  const deleteRecurring = useRecurringStore((s) => s.deleteRecurring);
  const [showRecurring, setShowRecurring] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);

  // Bulk Actions State
  const [selectedIds, setSelectedIds] = useState([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [bulkCardId, setBulkCardId] = useState('');
  const [bulkCategoryId, setBulkCategoryId] = useState('');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [sortField, setSortField] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [showFilters, setShowFilters] = useState(false);

  // Form state
  const [form, setForm] = useState({
    date: todayISO(),
    amount: '',
    type: 'expense',
    categoryId: '',
    cardId: '',
    description: '',
    notes: '',
    currency: 'DOP',
    isRecurring: false,
    recurrencePattern: 'monthly',
  });
  // Errores de validación por campo, visibles e inline (WCAG 3.3.1).
  const [formErrors, setFormErrors] = useState({});

  const resetForm = () => {
    setForm({
      date: todayISO(),
      amount: '',
      type: 'expense',
      categoryId: '',
      cardId: '',
      description: '',
      notes: '',
      currency: 'DOP',
      isRecurring: false,
      recurrencePattern: 'monthly',
    });
    setFormErrors({});
    setEditingTransaction(null);
  };

  const openEditForm = (transaction) => {
    setForm({ ...transaction });
    setEditingTransaction(transaction.id);
    setShowForm(true);
  };

  // Cmd/Ctrl+T abre el formulario de nueva transacción desde esta página.
  usePageShortcuts({
    newTransaction: () => {
      resetForm();
      setShowForm(true);
    },
  });

  const handleDescriptionChange = (description) => {
    setForm((prev) => {
      const updated = { ...prev, description };
      // Auto-categorize
      if (!editingTransaction) {
        const suggested = autoCategorize(description, categories);
        if (suggested) {
          updated.categoryId = suggested.id;
          // Auto-set type from category
          if (suggested.type === 'income') updated.type = 'income';
          else if (suggested.type === 'savings') updated.type = 'savings';
          else updated.type = 'expense';
        }
      }
      return updated;
    });
  };

  // Preview del cashback. Para USD se aproxima con la tasa fija; el monto real
  // guardado lo recalcula el store sobre el monto convertido a DOP.
  const calculatedCashback = useMemo(() => {
    // El cashback solo aplica a gastos, nunca a ingresos ni ahorros.
    if (!form.cardId || form.type !== 'expense') return 0;
    const card = cards.find(c => c.id === form.cardId);
    const baseAmount = form.currency === 'USD' ? Number(form.amount) * fxRate : Number(form.amount);
    return computeCashback(card, form.categoryId, baseAmount);
  }, [form.cardId, form.type, form.categoryId, form.amount, form.currency, cards, fxRate]);

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validación visible: en vez de un return silencioso, marcamos cada campo
    // que falta y enfocamos el primero para que el usuario sepa qué corregir.
    const errors = {};
    if (!form.date) errors.date = 'La fecha es obligatoria.';
    if (!form.amount || Number(form.amount) <= 0) errors.amount = 'Ingresa un monto mayor que 0.';
    if (!form.categoryId) errors.categoryId = 'Elige una categoría.';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      const firstField = ['date', 'amount', 'categoryId'].find((f) => errors[f]);
      const el = document.getElementById(`tx-field-${firstField}`);
      if (el) el.focus();
      return;
    }
    setFormErrors({});

    const formattedDescription = titleCase(form.description);

    const data = {
      ...form,
      description: formattedDescription,
      amount: Number(form.amount),
      cashbackEarned: calculatedCashback,
    };

    if (editingTransaction) {
      updateTransaction(editingTransaction, data);
    } else {
      addTransaction(data);
      // Si se marcó como recurrente, además se crea la plantilla. La primera
      // ocurrencia es la transacción recién registrada; la plantilla apunta a la
      // SIGUIENTE fecha para que materializeDue no la duplique hoy.
      if (form.isRecurring) {
        addRecurring({
          categoryId: form.categoryId,
          cardId: form.cardId,
          amount: Number(form.amount),
          type: form.type,
          description: formattedDescription,
          notes: form.notes,
          currency: form.currency,
          frequency: form.recurrencePattern,
          nextDate: advanceDate(form.date, form.recurrencePattern),
        });
      }
    }

    resetForm();
    setShowForm(false);
  };

  // Filter + Sort
  const filtered = useMemo(() => {
    let result = [...transactions];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.description?.toLowerCase().includes(q) ||
          t.notes?.toLowerCase().includes(q)
      );
    }

    if (filterType) {
      result = result.filter((t) => t.type === filterType);
    }

    if (filterCategory) {
      if (filterCategory === UNCATEGORIZED) {
        const validIds = new Set(categories.map((c) => c.id));
        result = result.filter((t) => !t.categoryId || !validIds.has(t.categoryId));
      } else {
        result = result.filter((t) => t.categoryId === filterCategory);
      }
    }

    if (filterDateFrom) {
      result = result.filter((t) => t.date >= filterDateFrom);
    }

    if (filterDateTo) {
      result = result.filter((t) => t.date <= filterDateTo);
    }

    result.sort((a, b) => {
      let valA, valB;
      if (sortField === 'date') {
        valA = a.date;
        valB = b.date;
      } else if (sortField === 'amount') {
        valA = Number(a.amount);
        valB = Number(b.amount);
      } else {
        valA = a[sortField] || '';
        valB = b[sortField] || '';
      }

      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [transactions, categories, searchQuery, filterType, filterCategory, filterDateFrom, filterDateTo, sortField, sortDir]);

  // Bulk Action Handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filtered.map(t => t.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (e, id) => {
    if (e.target.checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(i => i !== id));
    }
  };

  // Borrado de una transacción con opción de deshacer. La fila desaparece y un
  // toast ofrece restaurarla; nada se pierde sin una segunda oportunidad.
  const handleDeleteWithUndo = async (tx) => {
    const ok = await deleteTransaction(tx.id);
    if (!ok) return;
    toast.success(
      (t) => (
        <span className="flex items-center gap-3">
          Transacción eliminada
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => {
              restoreTransaction(tx);
              toast.dismiss(t.id);
            }}
          >
            Deshacer
          </button>
        </span>
      ),
      { duration: 6000 }
    );
  };

  const handleBulkDelete = async () => {
    const removed = await bulkDeleteTransactions(selectedIds);
    setSelectedIds([]);
    setShowBulkDeleteConfirm(false);
    if (removed && removed.length > 0) {
      toast.success(
        (t) => (
          <span className="flex items-center gap-3">
            {removed.length} transacciones eliminadas
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => {
                restoreManyTransactions(removed);
                toast.dismiss(t.id);
              }}
            >
              Deshacer
            </button>
          </span>
        ),
        { duration: 6000 }
      );
    }
  };

  const handleBulkAssignCard = () => {
    bulkAssignCard(selectedIds, bulkCardId);
    setSelectedIds([]);
    setBulkCardId('');
  };

  const handleBulkAssignCategory = () => {
    if (!bulkCategoryId) return;
    bulkAssignCategory(selectedIds, bulkCategoryId);
    setSelectedIds([]);
    setBulkCategoryId('');
  };

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const getCategoryName = (categoryId) => {
    const cat = categories.find((c) => c.id === categoryId);
    return cat ? `${cat.icon} ${cat.name}` : '—';
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterType('');
    setFilterCategory('');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  const hasActiveFilters = filterType || filterCategory || filterDateFrom || filterDateTo;

  // Cuántas transacciones no tienen categoría (o apuntan a una ya eliminada),
  // para mostrarlo en el filtro y facilitar su reasignación.
  const uncategorizedCount = useMemo(() => {
    const validIds = new Set(categories.map((c) => c.id));
    return transactions.filter((t) => !t.categoryId || !validIds.has(t.categoryId)).length;
  }, [transactions, categories]);

  // Group categories by type for form select
  const categoryGroups = useMemo(() => {
    const groups = {
      income: categories.filter(c => c.type === 'income' && c.isActive),
      fixed_expense: categories.filter(c => c.type === 'fixed_expense' && c.isActive),
      variable_expense: categories.filter(c => c.type === 'variable_expense' && c.isActive),
      savings: categories.filter(c => c.type === 'savings' && c.isActive),
    };
    return groups;
  }, [categories]);

  // Icono de orden: muestra la dirección activa en la columna ordenada y un
  // icono neutro y atenuado en las demás (recognition, Nielsen #6). Es una
  // función que devuelve JSX (no un componente) para no remontar en cada render.
  const renderSortIcon = (field) => {
    if (sortField !== field) {
      return <ArrowUpDown size={12} style={{ opacity: 0.4 }} aria-hidden="true" />;
    }
    return sortDir === 'asc'
      ? <ArrowUp size={12} style={{ color: 'var(--accent-primary)' }} aria-hidden="true" />
      : <ArrowDown size={12} style={{ color: 'var(--accent-primary)' }} aria-hidden="true" />;
  };

  return (
    <div className="page-container" id="tour-transactions-content">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Transacciones</h1>
          <p className="page-subtitle">Gestiona tus ingresos y gastos</p>
        </div>
        <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={() => setShowRecurring(true)}>
            <Repeat size={16} /> Recurrentes{recurring.length > 0 ? ` (${recurring.length})` : ''}
          </button>
          {transactions.length > 0 && (
            <button className="btn btn-primary" onClick={() => {
              resetForm();
              setShowForm(true);
            }}>
              <Plus size={16} /> Nueva Transacción
            </button>
          )}
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="flex items-center gap-4">
          <div className="header-search" style={{ flex: 1, width: 'auto' }}>
            <Search size={16} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Buscar por descripción o notas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ border: 'none', padding: 'var(--space-1) 0' }}
            />
            {searchQuery && (
              <button className="btn-icon" onClick={() => setSearchQuery('')} aria-label="Limpiar búsqueda">
                <X size={14} aria-hidden="true" />
              </button>
            )}
          </div>
          <button
            className={`btn ${showFilters ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={16} /> Filtros
            {hasActiveFilters && (
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: 'var(--accent-primary)',
                  marginLeft: 4,
                }}
              />
            )}
          </button>
          {hasActiveFilters && (
            <button className="btn btn-ghost" onClick={clearFilters}>
              Limpiar filtros
            </button>
          )}
        </div>

        {showFilters && (
          <div
            className="form-row"
            style={{
              marginTop: 'var(--space-4)',
              paddingTop: 'var(--space-4)',
              borderTop: '1px solid var(--border-primary)',
              gridTemplateColumns: 'repeat(2, 1fr)',
            }}
          >
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="tx-filter-type">Tipo</label>
              <select id="tx-filter-type" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                <option value="">Todos</option>
                <option value="income">Ingresos</option>
                <option value="expense">Gastos</option>
                <option value="savings">Ahorros</option>
                <option value="debt_payment">Pago Deuda</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="tx-filter-category">Categoría</label>
              <select id="tx-filter-category" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                <option value="">Todas</option>
                <option value={UNCATEGORIZED}>
                  🏷️ Sin categoría{uncategorizedCount > 0 ? ` (${uncategorizedCount})` : ''}
                </option>
                {categories.filter(c => c.isActive).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="tx-filter-from">Desde</label>
              <input
                id="tx-filter-from"
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="tx-filter-to">Hasta</label>
              <input
                id="tx-filter-to"
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Bulk Actions Toolbar */}
      {selectedIds.length > 0 && (
        <div className="card" style={{ marginBottom: 'var(--space-6)', background: 'var(--accent-primary-subtle)', borderColor: 'var(--accent-primary)' }}>
          <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: 'var(--space-3)' }}>
            <div className="font-semibold" style={{ color: 'var(--accent-primary)' }}>
              {selectedIds.length} transacciones seleccionadas
            </div>
            <div className="flex items-center gap-4" style={{ flexWrap: 'wrap' }}>
              <div className="flex items-center gap-2">
                <select
                  value={bulkCategoryId}
                  onChange={(e) => setBulkCategoryId(e.target.value)}
                  style={{ padding: 'var(--space-2) var(--space-3)', fontSize: 'var(--font-sm)' }}
                >
                  <option value="">Seleccionar categoría</option>
                  {categoryGroups.income.length > 0 && (
                    <optgroup label="💰 Ingresos">
                      {categoryGroups.income.map(c => (
                        <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                      ))}
                    </optgroup>
                  )}
                  {categoryGroups.fixed_expense.length > 0 && (
                    <optgroup label="📌 Gastos Fijos">
                      {categoryGroups.fixed_expense.map(c => (
                        <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                      ))}
                    </optgroup>
                  )}
                  {categoryGroups.variable_expense.length > 0 && (
                    <optgroup label="🔄 Gastos Variables">
                      {categoryGroups.variable_expense.map(c => (
                        <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                      ))}
                    </optgroup>
                  )}
                  {categoryGroups.savings.length > 0 && (
                    <optgroup label="🏦 Ahorros">
                      {categoryGroups.savings.map(c => (
                        <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <button className="btn btn-primary" onClick={handleBulkAssignCategory} style={{ padding: 'var(--space-2) var(--space-4)' }}>
                  Asignar Categoría
                </button>
              </div>
              <div style={{ width: '1px', height: '24px', background: 'var(--border-primary)' }}></div>
              <div className="flex items-center gap-2">
                <select
                  value={bulkCardId}
                  onChange={(e) => setBulkCardId(e.target.value)}
                  style={{ padding: 'var(--space-2) var(--space-3)', fontSize: 'var(--font-sm)' }}
                >
                  <option value="">Sin tarjeta</option>
                  {cards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button className="btn btn-primary" onClick={handleBulkAssignCard} style={{ padding: 'var(--space-2) var(--space-4)' }}>
                  Asignar Tarjeta
                </button>
              </div>
              <div style={{ width: '1px', height: '24px', background: 'var(--border-primary)' }}></div>
              <button 
                className="btn btn-secondary" 
                style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)', padding: 'var(--space-2) var(--space-4)' }}
                onClick={() => setShowBulkDeleteConfirm(true)}
              >
                <Trash2 size={14} style={{ marginRight: 4 }} /> Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transactions Table */}
      {showSkeleton ? (
        <SkeletonTable rows={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ArrowLeftRight}
          title={transactions.length === 0 ? 'Sin transacciones aún' : 'No hay resultados'}
          description={
            transactions.length === 0
              ? 'Registra tu primera transacción para empezar a controlar tus finanzas.'
              : 'Intenta cambiar los filtros o la búsqueda.'
          }
          action={
            transactions.length === 0 && (
              <button
                className="btn btn-primary"
                onClick={() => {
                  resetForm();
                  setShowForm(true);
                }}
              >
                <Plus size={16} /> Agregar Transacción
              </button>
            )
          }
        />
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={filtered.length > 0 && selectedIds.length === filtered.length}
                      onChange={handleSelectAll}
                      aria-label="Seleccionar todas las transacciones"
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <th
                    style={{ cursor: 'pointer' }}
                    onClick={() => toggleSort('date')}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSort('date'); } }}
                    tabIndex={0}
                    role="columnheader"
                    aria-sort={sortField === 'date' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                  >
                    <span className="flex items-center gap-1">
                      Fecha {renderSortIcon('date')}
                    </span>
                  </th>
                  <th>Descripción</th>
                  <th>Categoría</th>
                  <th>Tipo</th>
                  <th
                    style={{ cursor: 'pointer', textAlign: 'right' }}
                    onClick={() => toggleSort('amount')}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSort('amount'); } }}
                    tabIndex={0}
                    role="columnheader"
                    aria-sort={sortField === 'amount' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                  >
                    <span className="flex items-center gap-1" style={{ justifyContent: 'flex-end' }}>
                      Monto {renderSortIcon('amount')}
                    </span>
                  </th>
                  <th style={{ width: 80, textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} style={{ background: selectedIds.includes(t.id) ? 'var(--accent-primary-subtle)' : undefined }}>
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(t.id)}
                        onChange={(e) => handleSelectOne(e, t.id)}
                        aria-label={`Seleccionar ${t.description || 'transacción'}`}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatDate(t.date)}</td>
                    <td>
                      <div>
                        <span className="font-semibold">{t.description || '—'}</span>
                        {t.notes && (
                          <span className="text-xs text-muted" style={{ display: 'block' }}>
                            {t.notes}
                          </span>
                        )}
                        {t.cashbackEarned > 0 && (
                          <span className="text-xs" style={{ display: 'block', color: 'var(--color-income)', marginTop: 2 }}>
                            ¡Cashback! Generó +{formatCurrency(t.cashbackEarned, t.currency)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>{getCategoryName(t.categoryId)}</td>
                    <td>
                      <span className={`badge ${getTypeBadgeClass(t.type)}`}>
                        {getTypeLabel(t.type)}
                      </span>
                    </td>
                    <td className="text-right">
                      {t.cashbackEarned > 0 && t.type !== 'income' ? (
                        <>
                          {/* Bruto: monto introducido, en el ámbar semántico (gasto antes de cashback) */}
                          <span className="font-semibold" style={{ color: 'var(--color-variable)' }}>
                            Bruto: -{formatCurrency(Math.abs(t.amount), t.currency)}
                          </span>
                          {/* Neto: monto tras cashback, todo en rojo */}
                          <span className="text-xs font-semibold" style={{ display: 'block', color: 'var(--color-danger)', marginTop: 2 }}>
                            Neto: -{formatCurrency(Math.abs(t.amount) - t.cashbackEarned, t.currency)}
                          </span>
                        </>
                      ) : (
                        <span className={t.type === 'income' ? 'amount-positive' : 'amount-negative'}>
                          {t.type === 'income' ? '+' : '-'}
                          {formatCurrency(Math.abs(t.amount), t.currency)}
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center justify-center gap-1">
                        <button
                          className="btn-icon"
                          onClick={() => openEditForm(t)}
                          title="Editar"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          className="btn-icon"
                          onClick={() => handleDeleteWithUndo(t)}
                          title="Eliminar"
                          aria-label={`Eliminar ${t.description || 'transacción'}`}
                          style={{ color: 'var(--color-danger)' }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transaction Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          resetForm();
        }}
        title={editingTransaction ? 'Editar Transacción' : 'Nueva Transacción'}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group" style={{ minWidth: 0 }}>
              <label className="form-label" htmlFor="tx-field-date">Fecha *</label>
              <input
                id="tx-field-date"
                type="date"
                value={form.date}
                onChange={(e) => {
                  setForm({ ...form, date: e.target.value });
                  if (formErrors.date) setFormErrors((p) => ({ ...p, date: undefined }));
                }}
                required
                aria-invalid={!!formErrors.date}
                aria-describedby={formErrors.date ? 'tx-err-date' : undefined}
                style={{ width: '100%' }}
              />
              {formErrors.date && <p className="form-error" id="tx-err-date">{formErrors.date}</p>}
            </div>
            <div className="form-group" style={{ minWidth: 0 }}>
              <label className="form-label" htmlFor="tx-field-type">Tipo</label>
              <select
                id="tx-field-type"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                style={{ width: '100%' }}
              >
                <option value="income">💰 Ingreso</option>
                <option value="expense">💸 Gasto</option>
                <option value="savings">🏦 Ahorro</option>
                <option value="debt_payment">💳 Pago Deuda</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="tx-field-description">Descripción</label>
            <input
              id="tx-field-description"
              type="text"
              value={form.description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              onBlur={(e) => setForm((prev) => ({ ...prev, description: titleCase(e.target.value) }))}
              placeholder="Ej: Supermercado Nacional, Uber, Salario..."
              autoComplete="off"
            />
            {!editingTransaction && form.categoryId && (
              <p className="text-xs" style={{ color: 'var(--accent-primary)', marginTop: 'var(--space-1)' }}>
                ✨ Categoría sugerida: {getCategoryName(form.categoryId)}
              </p>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="tx-field-amount">Monto *</label>
              <CurrencyInput
                id="tx-field-amount"
                value={form.amount}
                onChange={(val) => {
                  setForm({ ...form, amount: val });
                  if (formErrors.amount) setFormErrors((p) => ({ ...p, amount: undefined }));
                }}
                placeholder="0.00"
                required
              />
              {formErrors.amount && <p className="form-error" id="tx-err-amount">{formErrors.amount}</p>}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="tx-field-currency">Moneda</label>
              <select
                id="tx-field-currency"
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
              >
                <option value="DOP">RD$</option>
                <option value="USD">US$</option>
              </select>
              {form.currency === 'USD' && form.amount && (
                <p className="text-xs" style={{ color: 'var(--text-tertiary)', marginTop: 'var(--space-1)' }}>
                  ≈ {formatCurrency(Number(form.amount) * fxRate)} (tasa: {fxRate}) — valor final según la tasa del día
                </p>
              )}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="tx-field-categoryId">Categoría *</label>
            <select
              id="tx-field-categoryId"
              value={form.categoryId}
              onChange={(e) => {
                setForm({ ...form, categoryId: e.target.value });
                if (formErrors.categoryId) setFormErrors((p) => ({ ...p, categoryId: undefined }));
              }}
              aria-invalid={!!formErrors.categoryId}
              aria-describedby={formErrors.categoryId ? 'tx-err-categoryId' : undefined}
            >
              <option value="">Seleccionar categoría</option>
              {categoryGroups.income.length > 0 && (
                <optgroup label="💰 Ingresos">
                  {categoryGroups.income.map(c => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                  ))}
                </optgroup>
              )}
              {categoryGroups.fixed_expense.length > 0 && (
                <optgroup label="📌 Gastos Fijos">
                  {categoryGroups.fixed_expense.map(c => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                  ))}
                </optgroup>
              )}
              {categoryGroups.variable_expense.length > 0 && (
                <optgroup label="🔄 Gastos Variables">
                  {categoryGroups.variable_expense.map(c => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                  ))}
                </optgroup>
              )}
              {categoryGroups.savings.length > 0 && (
                <optgroup label="🏦 Ahorros">
                  {categoryGroups.savings.map(c => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                  ))}
                </optgroup>
              )}
            </select>
            {formErrors.categoryId && <p className="form-error" id="tx-err-categoryId">{formErrors.categoryId}</p>}
          </div>

          {form.type === 'expense' && cards.length > 0 && (
            <div className="form-group">
              <label className="form-label" htmlFor="tx-field-card">Tarjeta (opcional)</label>
              <select
                id="tx-field-card"
                value={form.cardId}
                onChange={(e) => setForm({ ...form, cardId: e.target.value })}
              >
                <option value="">Sin tarjeta</option>
                {cards.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {calculatedCashback > 0 && (
                <div className="text-xs mt-2" style={{ color: 'var(--color-income)' }}>
                  <span className="font-semibold">¡Cashback!</span> Esta compra generará <span className="font-bold">+{formatCurrency(calculatedCashback)}</span>
                </div>
              )}
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="tx-field-notes">Notas (opcional)</label>
            <textarea
              id="tx-field-notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Detalles adicionales..."
              rows={2}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div className="form-group">
            <label className="flex items-center gap-2" style={{ cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.isRecurring}
                onChange={(e) => setForm({ ...form, isRecurring: e.target.checked })}
                style={{ width: 'auto' }}
              />
              <span className="form-label" style={{ marginBottom: 0 }}>
                Transacción recurrente
              </span>
            </label>
            {form.isRecurring && (
              <select
                aria-label="Frecuencia de recurrencia"
                value={form.recurrencePattern}
                onChange={(e) => setForm({ ...form, recurrencePattern: e.target.value })}
                style={{ marginTop: 'var(--space-2)' }}
              >
                <option value="weekly">Semanal</option>
                <option value="biweekly">Quincenal</option>
                <option value="monthly">Mensual</option>
              </select>
            )}
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
            >
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              {editingTransaction ? 'Guardar Cambios' : 'Registrar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Bulk delete sí conserva confirmación: borra muchas filas de una vez. */}
      <ConfirmDialog
        isOpen={showBulkDeleteConfirm}
        onClose={() => setShowBulkDeleteConfirm(false)}
        onConfirm={handleBulkDelete}
        title="Eliminar Transacciones Múltiples"
        message={`¿Seguro que quieres eliminar ${selectedIds.length} transacciones seleccionadas? Esta acción no se puede deshacer.`}
      />

      {/* Recurring templates management */}
      <Modal
        isOpen={showRecurring}
        onClose={() => setShowRecurring(false)}
        title="Transacciones recurrentes"
      >
        <p className="text-sm text-muted mb-4">
          Se generan solas al abrir la app cuando llega su fecha. Para crear una,
          marca "Transacción recurrente" al registrar una transacción.
        </p>
        {recurring.length === 0 ? (
          <div className="text-center text-muted py-8">No tienes recurrentes activas.</div>
        ) : (
          <div className="flex flex-col gap-3">
            {recurring.map((r) => {
              const cat = categories.find((c) => c.id === r.categoryId);
              const freqLabel = r.frequency === 'weekly' ? 'Semanal' : r.frequency === 'biweekly' ? 'Quincenal' : 'Mensual';
              return (
                <div
                  key={r.id}
                  className="flex items-center justify-between gap-3"
                  style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-3) var(--space-4)', opacity: r.active ? 1 : 0.55 }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="font-semibold truncate">
                      {cat?.icon || '🔁'} {r.description || cat?.name || 'Recurrente'}
                    </div>
                    <div className="text-xs text-muted">
                      {freqLabel} · próxima: {formatDate(r.nextDate)}
                      {!r.active && ' · pausada'}
                    </div>
                  </div>
                  <div className="font-bold amount-neutral" style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
                    {formatCurrency(r.amount, r.currency)}
                  </div>
                  <div className="flex items-center gap-1" style={{ flexShrink: 0 }}>
                    <button className="btn-icon" title={r.active ? 'Pausar' : 'Activar'} onClick={() => toggleRecurring(r.id)}>
                      {r.active ? <Pause size={15} /> : <Play size={15} />}
                    </button>
                    <button className="btn-icon" title="Eliminar" style={{ color: 'var(--color-danger)' }} onClick={() => deleteRecurring(r.id)}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Modal>
    </div>
  );
}
