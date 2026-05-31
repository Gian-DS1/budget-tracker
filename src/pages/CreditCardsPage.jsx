// FinTrack RD — Credit Cards Page

import { useState, useMemo } from 'react';
import { Plus, CreditCard, Edit3, Trash2, CheckCircle2, Calendar, History, RotateCcw } from 'lucide-react';
import useCreditCardStore from '../stores/useCreditCardStore';
import useTransactionStore from '../stores/useTransactionStore';
import useCategoryStore from '../stores/useCategoryStore';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import CashbackRulesEditor from '../components/creditcards/CashbackRulesEditor';
import { formatCurrency, formatDate, todayISO } from '../utils/formatters';
import { getCardCycles, getStatementAmount, isStatementPaid, getStatementHistory, getLifetimeCashback } from '../utils/creditCards';
import { getCatalogBanks, getCatalogCardsByBank, getCatalogCard, resolveCardCashback } from '../data/creditCardCatalog';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#a855f7', '#ec4899'];

const emptyForm = { name: '', bank: '', cutoffDay: '', dueDay: '', color: '#6366f1', cashbackRules: [], catalogId: null, note: '' };

export default function CreditCardsPage() {
  const { cards, addCard, updateCard, deleteCard, markStatementPaid } = useCreditCardStore();
  const { transactions } = useTransactionStore();
  const { categories, ensureCategory } = useCategoryStore();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [historyCard, setHistoryCard] = useState(null);

  // Flujo de creación: 'predefinida' | 'personalizada' (solo aplica al crear).
  const [cardType, setCardType] = useState('predefinida');
  const [selectedBank, setSelectedBank] = useState('');
  const [showCashback, setShowCashback] = useState(false);

  const banks = getCatalogBanks();

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setCardType('predefinida');
    setSelectedBank('');
    setShowCashback(false);
    setShowForm(true);
  };

  const openEdit = (card) => {
    setForm({
      name: card.name,
      bank: card.bank,
      cutoffDay: String(card.cutoffDay),
      dueDay: String(card.dueDay),
      color: card.color,
      cashbackRules: card.cashbackRules || [],
      catalogId: card.catalogId || null,
      note: card.catalogId ? (getCatalogCard(card.catalogId)?.note || '') : '',
    });
    setEditingId(card.id);
    setShowCashback(false);
    setShowForm(true);
  };

  // El usuario elige una tarjeta del catálogo: pre-llena nombre/banco/color/reglas.
  // Resuelve las reglas (crea categorías de ecosistema si faltan) en este momento.
  const handleSelectTemplate = async (catalogId) => {
    const template = getCatalogCard(catalogId);
    if (!template) {
      setForm((f) => ({ ...emptyForm, cutoffDay: f.cutoffDay, dueDay: f.dueDay }));
      return;
    }
    const resolved = await resolveCardCashback(template, categories, ensureCategory);
    setForm((f) => ({
      ...emptyForm,
      cutoffDay: f.cutoffDay,
      dueDay: f.dueDay,
      name: template.name,
      bank: template.bank,
      color: template.color,
      catalogId: template.id,
      cashbackRules: resolved,
      note: template.note || '',
    }));
  };

  const handleRestoreTemplate = async () => {
    const template = getCatalogCard(form.catalogId);
    if (!template) return;
    const resolved = await resolveCardCashback(template, categories, ensureCategory);
    setForm((f) => ({ ...f, cashbackRules: resolved, note: template.note || '' }));
  };

  const closeForm = () => {
    setShowForm(false);
    setForm(emptyForm);
    setEditingId(null);
    setSelectedBank('');
    setShowCashback(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const cutoffDay = parseInt(form.cutoffDay, 10);
    const dueDay = parseInt(form.dueDay, 10);
    if (!form.name || !(cutoffDay >= 1 && cutoffDay <= 31) || !(dueDay >= 1 && dueDay <= 31)) return;
    const payload = {
      name: form.name,
      bank: form.bank,
      cutoffDay,
      dueDay,
      color: form.color,
      cashbackRules: form.cashbackRules || [],
      catalogId: form.catalogId || null,
    };
    if (editingId) updateCard(editingId, payload);
    else addCard(payload);
    closeForm();
  };

  const isPredefined = editingId ? !!form.catalogId : cardType === 'predefinida';

  const rows = useMemo(() => {
    return cards.map((card) => {
      const cy = getCardCycles(card, new Date());
      const openAmount = getStatementAmount(transactions, card.id, cy.openStartISO, cy.openEndISO);
      const closedAmount = getStatementAmount(transactions, card.id, cy.closedStartISO, cy.closedEndISO);
      const paid = isStatementPaid(card, cy.closedEndISO);
      
      const openCashback = transactions
        .filter(t => t.cardId === card.id && t.date >= cy.openStartISO && t.date <= cy.openEndISO)
        .reduce((sum, t) => sum + (t.cashbackEarned || 0), 0);

      const closedCashback = transactions
        .filter(t => t.cardId === card.id && t.date >= cy.closedStartISO && t.date <= cy.closedEndISO)
        .reduce((sum, t) => sum + (t.cashbackEarned || 0), 0);

      const history = getStatementHistory(card);
      const lifetimeCashback = getLifetimeCashback(card);

      return { card, cy, openAmount, closedAmount, paid, openCashback, closedCashback, history, lifetimeCashback };
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
          {rows.map(({ card, cy, openAmount, closedAmount, paid, openCashback, closedCashback, history, lifetimeCashback }) => (
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
                    <>
                      <div className="flex justify-between items-center text-xs mt-1" style={{ color: 'var(--color-income)' }}>
                        <span>Cashback de este ciclo</span>
                        <span className="font-semibold">+{formatCurrency(openCashback)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs mt-1 font-semibold">
                        <span className="text-muted">Neto a deber</span>
                        <span className="text-primary">{formatCurrency(openAmount - openCashback)}</span>
                      </div>
                    </>
                  )}
                </div>

                <div style={{ borderTop: '1px solid var(--border-primary)', paddingTop: 'var(--space-4)' }}>
                  <div className="kpi-label">Estado de cuenta {paid ? '(pagado)' : 'por pagar'}</div>
                  <div className="kpi-value" style={{ color: paid ? 'var(--color-success)' : 'var(--text-primary)' }}>
                    {formatCurrency(closedAmount - closedCashback)}
                  </div>
                  {closedCashback > 0 && (
                    <>
                      <div className="flex justify-between items-center text-xs mt-2" style={{ color: 'var(--color-income)' }}>
                        <span>Cashback aplicado</span>
                        <span className="font-semibold">−{formatCurrency(closedCashback)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs mt-1 text-muted">
                        <span>Consumo bruto</span>
                        <span>{formatCurrency(closedAmount)}</span>
                      </div>
                    </>
                  )}
                  <div className="text-xs text-muted mt-2 flex items-center gap-1">
                    <Calendar size={12} /> Vence el {formatDate(cy.dueDateISO)}
                  </div>
                  {!paid && closedAmount > 0 && (
                    <button
                      className="btn btn-secondary btn-sm mt-4"
                      onClick={() => markStatementPaid(card.id, {
                        cycleEnd: cy.closedEndISO,
                        periodStart: cy.closedStartISO,
                        periodEnd: cy.closedEndISO,
                        amount: closedAmount,
                        cashback: closedCashback,
                        paidAt: todayISO(),
                      })}
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

                {/* Historial y cashback acumulado de por vida */}
                {history.length > 0 && (
                  <div style={{ borderTop: '1px solid var(--border-primary)', paddingTop: 'var(--space-4)' }}>
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="kpi-label" style={{ marginBottom: 2 }}>Cashback acumulado</div>
                        <div className="font-bold" style={{ color: 'var(--color-income)' }}>
                          +{formatCurrency(lifetimeCashback)}
                        </div>
                      </div>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setHistoryCard(card)}
                      >
                        <History size={14} /> Historial ({history.length})
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={showForm}
        onClose={closeForm}
        title={editingId ? 'Editar Tarjeta' : 'Nueva Tarjeta'}
      >
        <form onSubmit={handleSubmit}>
          {/* Selector de tipo (solo al crear) */}
          {!editingId && (
            <div className="form-group">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className={`btn ${cardType === 'predefinida' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1 }}
                  onClick={() => { setCardType('predefinida'); setForm({ ...emptyForm, cutoffDay: form.cutoffDay, dueDay: form.dueDay }); setSelectedBank(''); }}
                >
                  Predefinida
                </button>
                <button
                  type="button"
                  className={`btn ${cardType === 'personalizada' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1 }}
                  onClick={() => { setCardType('personalizada'); setForm({ ...emptyForm, cutoffDay: form.cutoffDay, dueDay: form.dueDay }); }}
                >
                  Personalizada
                </button>
              </div>
            </div>
          )}

          {/* Predefinida (crear): selección de banco + tarjeta */}
          {!editingId && cardType === 'predefinida' && (
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Banco *</label>
                <select
                  value={selectedBank}
                  onChange={(e) => { setSelectedBank(e.target.value); handleSelectTemplate(''); }}
                  style={{ padding: '8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', background: 'var(--bg-input)', width: '100%' }}
                >
                  <option value="">Selecciona un banco</option>
                  {banks.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Tarjeta *</label>
                <select
                  value={form.catalogId || ''}
                  disabled={!selectedBank}
                  onChange={(e) => handleSelectTemplate(e.target.value)}
                  style={{ padding: '8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', background: 'var(--bg-input)', width: '100%' }}
                >
                  <option value="">Selecciona una tarjeta</option>
                  {getCatalogCardsByBank(selectedBank).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Nombre/Banco: solo-lectura para predefinida, editable para personalizada */}
          {isPredefined ? (
            form.catalogId && (
              <div className="form-group">
                <label className="form-label">Tarjeta</label>
                <div className="flex items-center gap-2" style={{ padding: '10px', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)' }}>
                  <CreditCard size={16} style={{ color: form.color }} />
                  <span className="font-semibold">{form.name}</span>
                  <span className="text-xs text-muted">· {form.bank}</span>
                </div>
              </div>
            )
          ) : (
            <>
              <div className="form-group">
                <label className="form-label">Nombre *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Visa Clásica" required />
              </div>
              <div className="form-group">
                <label className="form-label">Banco</label>
                <input type="text" value={form.bank} onChange={(e) => setForm({ ...form, bank: e.target.value })} placeholder="Ej: Banco Popular" />
              </div>
            </>
          )}

          {/* Corte / Pago: siempre editables (visibles una vez elegida la tarjeta en predefinida) */}
          {(!isPredefined || form.catalogId) && (
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
          )}

          {/* Color: editable siempre (cosmético) */}
          {(!isPredefined || form.catalogId) && (
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
          )}

          {/* Cashback */}
          {(!isPredefined || form.catalogId) && (
            <div className="form-group" style={{ borderTop: '1px solid var(--border-primary)', paddingTop: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
              {isPredefined ? (
                <>
                  <button
                    type="button"
                    className="flex items-center justify-between w-full"
                    onClick={() => setShowCashback((v) => !v)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    <span className="form-label font-semibold" style={{ margin: 0 }}>Personalizar cashback</span>
                    <span className="text-xs text-muted">{showCashback ? 'Ocultar' : 'Mostrar'}</span>
                  </button>
                  {form.note && <div className="text-xs text-muted mt-2">{form.note}</div>}
                  {showCashback && (
                    <div className="mt-3">
                      <CashbackRulesEditor
                        rules={form.cashbackRules}
                        categories={categories}
                        onChange={(r) => setForm({ ...form, cashbackRules: r })}
                      />
                      <button type="button" className="btn btn-secondary btn-sm mt-3" onClick={handleRestoreTemplate}>
                        <RotateCcw size={14} /> Restaurar valores del banco
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <label className="form-label font-semibold">Reglas de Cashback</label>
                  <CashbackRulesEditor
                    rules={form.cashbackRules}
                    categories={categories}
                    onChange={(r) => setForm({ ...form, cashbackRules: r })}
                  />
                </>
              )}
            </div>
          )}

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={closeForm}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={isPredefined && !form.catalogId}>
              {editingId ? 'Guardar Cambios' : 'Agregar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Historial de estados de cuenta */}
      <Modal
        isOpen={!!historyCard}
        onClose={() => setHistoryCard(null)}
        title={historyCard ? `Historial — ${historyCard.name}` : 'Historial'}
      >
        {historyCard && (() => {
          const history = getStatementHistory(historyCard);
          const lifetime = getLifetimeCashback(historyCard);
          return (
            <>
              <div className="flex justify-between items-center mb-4 p-3" style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                <span className="text-sm text-muted">Cashback acumulado de por vida</span>
                <span className="font-bold" style={{ color: 'var(--color-income)' }}>+{formatCurrency(lifetime)}</span>
              </div>
              <div className="flex flex-col gap-2">
                {history.map((s, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3" style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                    <div>
                      <div className="font-semibold text-sm">
                        {s.periodStart ? `${formatDate(s.periodStart)} → ${formatDate(s.periodEnd)}` : `Corte ${formatDate(s.cycleEnd)}`}
                      </div>
                      <div className="text-xs text-muted">
                        {s.paidAt ? `Pagado el ${formatDate(s.paidAt)}` : 'Sin fecha de pago registrada'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{formatCurrency(s.amount)}</div>
                      {s.cashback > 0 && (
                        <div className="text-xs" style={{ color: 'var(--color-income)' }}>+{formatCurrency(s.cashback)} cashback</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          );
        })()}
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
