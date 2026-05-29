// FinTrack RD — Credit Cards Page

import { useState, useMemo } from 'react';
import { Plus, CreditCard, Edit3, Trash2, CheckCircle2, Calendar, X } from 'lucide-react';
import useCreditCardStore from '../stores/useCreditCardStore';
import useTransactionStore from '../stores/useTransactionStore';
import useCategoryStore from '../stores/useCategoryStore';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import { formatCurrency, formatDate } from '../utils/formatters';
import { getCardCycles, getStatementAmount, isStatementPaid } from '../utils/creditCards';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#a855f7', '#ec4899'];

const emptyForm = { name: '', bank: '', cutoffDay: '', dueDay: '', color: '#6366f1', cashbackRules: [] };

export default function CreditCardsPage() {
  const { cards, addCard, updateCard, deleteCard, markStatementPaid } = useCreditCardStore();
  const { transactions } = useTransactionStore();
  const { categories } = useCategoryStore();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  
  // Cashback Rule UI State
  const [newRuleCategory, setNewRuleCategory] = useState('all');
  const [newRulePercentage, setNewRulePercentage] = useState('');

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (card) => {
    setForm({ 
      name: card.name, 
      bank: card.bank, 
      cutoffDay: String(card.cutoffDay), 
      dueDay: String(card.dueDay), 
      color: card.color,
      cashbackRules: card.cashbackRules || []
    });
    setEditingId(card.id);
    setShowForm(true);
  };

  const handleAddRule = () => {
    if (!newRulePercentage || isNaN(Number(newRulePercentage))) return;
    const rules = [...(form.cashbackRules || [])];
    
    // Check if rule for this category already exists and update it
    const existingIdx = rules.findIndex(r => r.categoryId === newRuleCategory);
    if (existingIdx >= 0) {
      rules[existingIdx].percentage = Number(newRulePercentage);
    } else {
      rules.push({ categoryId: newRuleCategory, percentage: Number(newRulePercentage) });
    }
    
    setForm({ ...form, cashbackRules: rules });
    setNewRuleCategory('all');
    setNewRulePercentage('');
  };

  const handleRemoveRule = (index) => {
    const rules = [...(form.cashbackRules || [])];
    rules.splice(index, 1);
    setForm({ ...form, cashbackRules: rules });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const cutoffDay = parseInt(form.cutoffDay, 10);
    const dueDay = parseInt(form.dueDay, 10);
    if (!form.name || !(cutoffDay >= 1 && cutoffDay <= 31) || !(dueDay >= 1 && dueDay <= 31)) return;
    const payload = { name: form.name, bank: form.bank, cutoffDay, dueDay, color: form.color, cashbackRules: form.cashbackRules || [] };
    if (editingId) updateCard(editingId, payload);
    else addCard(payload);
    setShowForm(false);
    setForm(emptyForm);
    setEditingId(null);
  };

  const rows = useMemo(() => {
    return cards.map((card) => {
      const cy = getCardCycles(card, new Date());
      const openAmount = getStatementAmount(transactions, card.id, cy.openStartISO, cy.openEndISO);
      const closedAmount = getStatementAmount(transactions, card.id, cy.closedStartISO, cy.closedEndISO);
      const paid = isStatementPaid(card, cy.closedEndISO);
      
      const openCashback = transactions
        .filter(t => t.cardId === card.id && t.date >= cy.openStartISO && t.date <= cy.openEndISO)
        .reduce((sum, t) => sum + (t.cashbackEarned || 0), 0);
        
      return { card, cy, openAmount, closedAmount, paid, openCashback };
    });
  }, [cards, transactions]);

  return (
    <div className="page-container" id="tour-creditcards-content">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Tarjetas</h1>
          <p className="page-subtitle">Control de consumo y fechas de tus tarjetas de crédito</p>
        </div>
        {cards.length > 0 && (
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} /> Nueva Tarjeta
          </button>
        )}
      </div>

      {cards.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="Sin tarjetas aún"
          description="Agrega una tarjeta para llevar el control de su consumo y fechas de corte y pago."
          action={
            <button className="btn btn-primary" onClick={openCreate}>
              <Plus size={16} /> Agregar Tarjeta
            </button>
          }
        />
      ) : (
        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
          {rows.map(({ card, cy, openAmount, closedAmount, paid, openCashback }) => (
            <div key={card.id} className="card" style={{ '--kpi-accent': card.color }}>
              <div className="card-header">
                <h3 className="card-title flex items-center gap-2">
                  <CreditCard size={18} style={{ color: card.color }} />
                  {card.name}
                </h3>
                <div className="flex items-center gap-1">
                  <button className="btn-icon" onClick={() => openEdit(card)} title="Editar"><Edit3 size={15} /></button>
                  <button className="btn-icon" onClick={() => setShowDeleteConfirm(card.id)} title="Eliminar" style={{ color: 'var(--color-danger)' }}><Trash2 size={15} /></button>
                </div>
              </div>

              {card.bank && <div className="text-xs text-muted mb-4">{card.bank}</div>}

              <div className="flex flex-col gap-4">
                <div>
                  <div className="kpi-label">Ciclo abierto (consumo)</div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted">Corte al: {formatDate(cy.openEndISO)}</span>
                    <span className="font-semibold text-primary">{formatCurrency(openAmount)}</span>
                  </div>
                  {openCashback > 0 && (
                    <div className="flex justify-between items-center text-xs mt-1" style={{ color: 'var(--color-income)' }}>
                      <span>Cashback Acumulado</span>
                      <span className="font-semibold">+{formatCurrency(openCashback)}</span>
                    </div>
                  )}
                </div>

                <div style={{ borderTop: '1px solid var(--border-primary)', paddingTop: 'var(--space-4)' }}>
                  <div className="kpi-label">Estado de cuenta {paid ? '(pagado)' : 'por pagar'}</div>
                  <div className="kpi-value" style={{ color: paid ? 'var(--color-success)' : 'var(--text-primary)' }}>
                    {formatCurrency(closedAmount)}
                  </div>
                  <div className="text-xs text-muted mt-2 flex items-center gap-1">
                    <Calendar size={12} /> Vence el {formatDate(cy.dueDateISO)}
                  </div>
                  {!paid && closedAmount > 0 && (
                    <button
                      className="btn btn-secondary btn-sm mt-4"
                      onClick={() => markStatementPaid(card.id, cy.closedEndISO)}
                    >
                      <CheckCircle2 size={14} /> Marcar como pagado
                    </button>
                  )}
                  {paid && (
                    <div className="text-xs mt-2 flex items-center gap-1" style={{ color: 'var(--color-success)' }}>
                      <CheckCircle2 size={14} /> Pagado
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setForm(emptyForm); setEditingId(null); }}
        title={editingId ? 'Editar Tarjeta' : 'Nueva Tarjeta'}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nombre *</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Visa Clásica" required />
          </div>
          <div className="form-group">
            <label className="form-label">Banco</label>
            <input type="text" value={form.bank} onChange={(e) => setForm({ ...form, bank: e.target.value })} placeholder="Ej: Banco Popular" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Día de corte *</label>
              <input type="number" min="1" max="31" value={form.cutoffDay} onChange={(e) => setForm({ ...form, cutoffDay: e.target.value })} placeholder="20" required />
            </div>
            <div className="form-group">
              <label className="form-label">Día de pago *</label>
              <input type="number" min="1" max="31" value={form.dueDay} onChange={(e) => setForm({ ...form, dueDay: e.target.value })} placeholder="5" required />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Color</label>
            <div className="flex items-center gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, color: c })}
                  style={{
                    width: 28, height: 28, borderRadius: '50%', background: c,
                    border: form.color === c ? '3px solid var(--text-primary)' : '2px solid var(--border-secondary)',
                    cursor: 'pointer',
                  }}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </div>
          
          <div className="form-group" style={{ borderTop: '1px solid var(--border-primary)', paddingTop: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
            <label className="form-label font-semibold">Reglas de Cashback</label>
            <div className="flex items-center gap-2 mb-3">
              <select 
                className="flex-1" 
                value={newRuleCategory} 
                onChange={(e) => setNewRuleCategory(e.target.value)}
                style={{ padding: '8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', background: 'var(--bg-input)' }}
              >
                <option value="all">Todas las categorías</option>
                <optgroup label="Ingresos">
                  {categories.filter(c => c.type === 'income' && c.isActive).map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </optgroup>
                <optgroup label="Gastos">
                  {categories.filter(c => c.type !== 'income' && c.type !== 'savings' && c.isActive).map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </optgroup>
              </select>
              <div className="relative" style={{ width: '80px' }}>
                <input 
                  type="number" 
                  min="0" max="100" step="0.1"
                  value={newRulePercentage} 
                  onChange={(e) => setNewRulePercentage(e.target.value)} 
                  placeholder="Ej: 5"
                  style={{ width: '100%', padding: '8px 24px 8px 8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', background: 'var(--bg-input)' }}
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted">%</span>
              </div>
              <button type="button" className="btn btn-secondary" onClick={handleAddRule}>
                <Plus size={16} />
              </button>
            </div>
            
            {form.cashbackRules && form.cashbackRules.length > 0 ? (
              <div className="flex flex-col gap-2">
                {form.cashbackRules.map((rule, idx) => {
                  const cat = categories.find(c => c.id === rule.categoryId);
                  const label = rule.categoryId === 'all' ? 'Todas las categorías' : (cat ? `${cat.icon} ${cat.name}` : 'Categoría desconocida');
                  return (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-md" style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border-primary)' }}>
                      <span className="text-sm">{label}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-sm" style={{ color: 'var(--color-income)' }}>{rule.percentage}%</span>
                        <button type="button" className="text-danger" onClick={() => handleRemoveRule(idx)}><X size={14} /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-xs text-muted">Añade beneficios de cashback para que el sistema los calcule automáticamente en tus gastos.</div>
            )}
          </div>
          
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); setForm(emptyForm); setEditingId(null); }}>Cancelar</button>
            <button type="submit" className="btn btn-primary">{editingId ? 'Guardar Cambios' : 'Agregar'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(null)}
        onConfirm={() => { deleteCard(showDeleteConfirm); setShowDeleteConfirm(null); }}
        title="Eliminar Tarjeta"
        message="¿Seguro que quieres eliminar esta tarjeta? Tus transacciones no se borran; solo se les quita la etiqueta de tarjeta."
      />
    </div>
  );
}
