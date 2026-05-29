// FinTrack RD — Transactions Page

import { useState, useMemo } from 'react';
import { Plus, X, Search, Filter, Trash2, ArrowLeftRight, ArrowUpDown, Edit3 } from 'lucide-react';
import useTransactionStore from '../stores/useTransactionStore';
import useCategoryStore from '../stores/useCategoryStore';
import useCreditCardStore from '../stores/useCreditCardStore';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import CurrencyInput from '../components/ui/CurrencyInput';
import { autoCategorize } from '../data/defaultCategories';
import { formatCurrency, formatDate, todayISO, getTypeBadgeClass, getTypeLabel } from '../utils/formatters';
import { USD_TO_DOP_RATE } from '../utils/constants';

export default function TransactionsPage() {
  const { transactions, addTransaction, updateTransaction, deleteTransaction, bulkDeleteTransactions, bulkAssignCard } =
    useTransactionStore();
  const { categories } = useCategoryStore();
  const { cards } = useCreditCardStore();

  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  // Bulk Actions State
  const [selectedIds, setSelectedIds] = useState([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [bulkCardId, setBulkCardId] = useState('');

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
    setEditingTransaction(null);
  };

  const openEditForm = (transaction) => {
    setForm({ ...transaction });
    setEditingTransaction(transaction.id);
    setShowForm(true);
  };

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

  const calculatedCashback = useMemo(() => {
    if (!form.cardId || !form.amount || isNaN(Number(form.amount))) return 0;
    const card = cards.find(c => c.id === form.cardId);
    if (!card || !card.cashbackRules || card.cashbackRules.length === 0) return 0;

    // Check specific category rule first, then 'all'
    const specificRule = card.cashbackRules.find(r => r.categoryId === form.categoryId);
    const allRule = card.cashbackRules.find(r => r.categoryId === 'all');
    
    const ruleToApply = specificRule || allRule;
    if (ruleToApply) {
      return (Number(form.amount) * ruleToApply.percentage) / 100;
    }
    return 0;
  }, [form.cardId, form.categoryId, form.amount, cards]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.amount || !form.date) return;

    const data = {
      ...form,
      amount: Number(form.amount),
      cashbackEarned: calculatedCashback,
    };

    if (editingTransaction) {
      updateTransaction(editingTransaction, data);
    } else {
      addTransaction(data);
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
      result = result.filter((t) => t.categoryId === filterCategory);
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
  }, [transactions, searchQuery, filterType, filterCategory, filterDateFrom, filterDateTo, sortField, sortDir]);

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

  const handleBulkDelete = () => {
    bulkDeleteTransactions(selectedIds);
    setSelectedIds([]);
    setShowBulkDeleteConfirm(false);
  };

  const handleBulkAssignCard = () => {
    bulkAssignCard(selectedIds, bulkCardId);
    setSelectedIds([]);
    setBulkCardId('');
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

  return (
    <div className="page-container" id="tour-transactions-content">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Transacciones</h1>
          <p className="page-subtitle">Gestiona tus ingresos y gastos</p>
        </div>
        {transactions.length > 0 && (
          <button className="btn btn-primary btn-lg" onClick={() => {
            resetForm();
            setShowForm(true);
          }}>
            <Plus size={18} /> Nueva Transacción
          </button>
        )}
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
              <button className="btn-icon" onClick={() => setSearchQuery('')}>
                <X size={14} />
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
              <label className="form-label">Tipo</label>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                <option value="">Todos</option>
                <option value="income">Ingresos</option>
                <option value="expense">Gastos</option>
                <option value="savings">Ahorros</option>
                <option value="debt_payment">Pago Deuda</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Categoría</label>
              <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                <option value="">Todas</option>
                {categories.filter(c => c.isActive).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Desde</label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Hasta</label>
              <input
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
          <div className="flex items-center justify-between">
            <div className="font-semibold" style={{ color: 'var(--accent-primary)' }}>
              {selectedIds.length} transacciones seleccionadas
            </div>
            <div className="flex items-center gap-4">
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
      {filtered.length === 0 ? (
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
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <th
                    style={{ cursor: 'pointer' }}
                    onClick={() => toggleSort('date')}
                  >
                    <span className="flex items-center gap-1">
                      Fecha <ArrowUpDown size={12} />
                    </span>
                  </th>
                  <th>Descripción</th>
                  <th>Categoría</th>
                  <th>Tipo</th>
                  <th
                    style={{ cursor: 'pointer', textAlign: 'right' }}
                    onClick={() => toggleSort('amount')}
                  >
                    <span className="flex items-center gap-1" style={{ justifyContent: 'flex-end' }}>
                      Monto <ArrowUpDown size={12} />
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
                      </div>
                    </td>
                    <td>{getCategoryName(t.categoryId)}</td>
                    <td>
                      <span className={`badge ${getTypeBadgeClass(t.type)}`}>
                        {getTypeLabel(t.type)}
                      </span>
                    </td>
                    <td className="text-right">
                      <span
                        className={
                          t.type === 'income'
                            ? 'amount-positive'
                            : 'amount-negative'
                        }
                      >
                        {t.type === 'income' ? '+' : '-'}
                        {formatCurrency(Math.abs(t.amount), t.currency)}
                      </span>
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
                          onClick={() => setShowDeleteConfirm(t.id)}
                          title="Eliminar"
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
              <label className="form-label">Fecha *</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
                style={{ width: '100%' }}
              />
            </div>
            <div className="form-group" style={{ minWidth: 0 }}>
              <label className="form-label">Tipo</label>
              <select
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
            <label className="form-label">Descripción</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
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
              <label className="form-label">Monto *</label>
              <CurrencyInput
                value={form.amount}
                onChange={(val) => setForm({ ...form, amount: val })}
                placeholder="0.00"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Moneda</label>
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
              >
                <option value="DOP">RD$</option>
                <option value="USD">US$</option>
              </select>
              {form.currency === 'USD' && form.amount && (
                <p className="text-xs" style={{ color: 'var(--text-tertiary)', marginTop: 'var(--space-1)' }}>
                  ≈ {formatCurrency(Number(form.amount) * USD_TO_DOP_RATE)} (tasa: {USD_TO_DOP_RATE})
                </p>
              )}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Categoría (Total: {categories.length})</label>
            <select
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
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
          </div>

          {form.type === 'expense' && cards.length > 0 && (
            <div className="form-group">
              <label className="form-label">Tarjeta (opcional)</label>
              <select
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
            <label className="form-label">Notas (opcional)</label>
            <textarea
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

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(null)}
        onConfirm={() => deleteTransaction(showDeleteConfirm)}
        title="Eliminar Transacción"
        message="¿Seguro que quieres eliminar esta transacción? Esta acción no se puede deshacer."
      />

      <ConfirmDialog
        isOpen={showBulkDeleteConfirm}
        onClose={() => setShowBulkDeleteConfirm(false)}
        onConfirm={handleBulkDelete}
        title="Eliminar Transacciones Múltiples"
        message={`¿Seguro que quieres eliminar ${selectedIds.length} transacciones seleccionadas? Esta acción no se puede deshacer.`}
      />
    </div>
  );
}
