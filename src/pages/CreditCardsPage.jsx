// FinTrack RD — Credit Cards Page

import { useState, useMemo } from 'react';
import { Plus, CreditCard, Edit3, Trash2, CheckCircle2, Calendar } from 'lucide-react';
import useCreditCardStore from '../stores/useCreditCardStore';
import useTransactionStore from '../stores/useTransactionStore';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import { formatCurrency, formatDate } from '../utils/formatters';
import { getCardCycles, getStatementAmount, isStatementPaid } from '../utils/creditCards';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#a855f7', '#ec4899'];

const emptyForm = { name: '', bank: '', cutoffDay: '', dueDay: '', color: '#6366f1' };

export default function CreditCardsPage() {
  const { cards, addCard, updateCard, deleteCard, markStatementPaid } = useCreditCardStore();
  const { transactions } = useTransactionStore();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (card) => {
    setForm({ name: card.name, bank: card.bank, cutoffDay: String(card.cutoffDay), dueDay: String(card.dueDay), color: card.color });
    setEditingId(card.id);
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const cutoffDay = parseInt(form.cutoffDay, 10);
    const dueDay = parseInt(form.dueDay, 10);
    if (!form.name || !(cutoffDay >= 1 && cutoffDay <= 31) || !(dueDay >= 1 && dueDay <= 31)) return;
    const payload = { name: form.name, bank: form.bank, cutoffDay, dueDay, color: form.color };
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
      return { card, cy, openAmount, closedAmount, paid };
    });
  }, [cards, transactions]);

  return (
    <div className="page-container">
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
          {rows.map(({ card, cy, openAmount, closedAmount, paid }) => (
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
                  <div className="kpi-value">{formatCurrency(openAmount)}</div>
                  <div className="text-xs text-muted mt-2 flex items-center gap-1">
                    <Calendar size={12} /> Cierra el {formatDate(cy.openEndISO)}
                  </div>
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
