// FinTrack RD — Debts Page

import { useState } from 'react';
import { Plus, CreditCard, TrendingDown, DollarSign, Edit2, Trash2 } from 'lucide-react';
import useDebtStore from '../stores/useDebtStore';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import CurrencyInput from '../components/ui/CurrencyInput';
import { formatCurrency, formatDate, todayISO, formatPercent } from '../utils/formatters';
import { calculateAmortization } from '../utils/calculations';
import toast from 'react-hot-toast';

export default function DebtsPage() {
  const {
    debts,
    addDebt,
    updateDebt,
    deleteDebt,
    addPayment,
    getPaymentsByDebt,
    getTotalDebt,
    getTotalMonthlyPayment,
  } = useDebtStore();

  const [showForm, setShowForm] = useState(false);
  const [editingDebt, setEditingDebt] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showPayment, setShowPayment] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(todayISO());

  const [form, setForm] = useState({
    creditorName: '',
    originalAmount: '',
    currentBalance: '',
    interestRate: '',
    monthlyPayment: '',
    currency: 'DOP',
    startDate: todayISO(),
  });

  const totalDebt = getTotalDebt();
  const totalMonthly = getTotalMonthlyPayment();

  const openEditForm = (debt) => {
    setForm({
      creditorName: debt.creditorName,
      originalAmount: debt.originalAmount,
      currentBalance: debt.currentBalance,
      interestRate: debt.interestRate,
      monthlyPayment: debt.monthlyPayment,
      currency: debt.currency || 'DOP',
      startDate: debt.startDate || todayISO(),
    });
    setEditingDebt(debt.id);
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.creditorName || !form.originalAmount || !form.monthlyPayment) return;
    
    const debtData = {
      ...form,
      originalAmount: Number(form.originalAmount),
      currentBalance: Number(form.currentBalance || form.originalAmount),
      interestRate: Number(form.interestRate) || 0,
      monthlyPayment: Number(form.monthlyPayment) || 0,
    };

    if (editingDebt) {
      updateDebt(editingDebt, debtData);
      toast.success('Deuda actualizada');
    } else {
      addDebt(debtData);
      toast.success('Deuda registrada');
    }

    setForm({
      creditorName: '',
      originalAmount: '',
      currentBalance: '',
      interestRate: '',
      monthlyPayment: '',
      currency: 'DOP',
      startDate: todayISO(),
    });
    setEditingDebt(null);
    setShowForm(false);
  };

  const handlePayment = (debtId) => {
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) return;

    addPayment(debtId, amount, paymentDate);

    const debt = debts.find((d) => d.id === debtId);
    const newBalance = Number(debt?.currentBalance) - amount;
    if (newBalance <= 0) {
      toast.success('🎉 ¡Deuda liquidada! Felicidades!', { duration: 5000 });
    } else {
      toast.success(`Pago de ${formatCurrency(amount)} registrado`);
    }

    setPaymentAmount('');
    setShowPayment(null);
  };

  return (
    <div className="page-container">
      <div className="page-header flex items-center justify-between" id="tour-debts-header">
        <div>
          <h1 className="page-title">Control de Deudas</h1>
          <p className="page-subtitle">
            Da seguimiento a tus préstamos y planifica cuándo quedarás libre de deudas.
          </p>
        </div>
        {debts.length > 0 && (
          <button className="btn btn-primary btn-lg" onClick={() => {
            setEditingDebt(null);
            setForm({
              creditorName: '',
              originalAmount: '',
              currentBalance: '',
              interestRate: '',
              monthlyPayment: '',
              currency: 'DOP',
              startDate: todayISO(),
            });
            setShowForm(true);
          }}>
            <Plus size={18} /> Nueva Deuda
          </button>
        )}
      </div>

      {/* Summary */}
      {debts.length > 0 && (
        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <div className="kpi-card" style={{ '--kpi-accent': 'var(--color-debt)' }}>
            <div className="kpi-label">Deuda Total</div>
            <div className="kpi-value" style={{ fontSize: 'var(--font-2xl)', color: 'var(--color-expense)' }}>
              {formatCurrency(totalDebt)}
            </div>
            <div className="kpi-icon" style={{ background: 'var(--color-debt-bg)', color: 'var(--color-debt)' }}>
              <CreditCard size={20} />
            </div>
          </div>
          <div className="kpi-card" style={{ '--kpi-accent': 'var(--color-variable)' }}>
            <div className="kpi-label">Pago Mensual Total</div>
            <div className="kpi-value" style={{ fontSize: 'var(--font-2xl)' }}>
              {formatCurrency(totalMonthly)}
            </div>
            <div className="kpi-icon" style={{ background: 'var(--color-variable-bg)', color: 'var(--color-variable)' }}>
              <DollarSign size={20} />
            </div>
          </div>
          <div className="kpi-card" style={{ '--kpi-accent': 'var(--accent-secondary)' }}>
            <div className="kpi-label">Deudas Activas</div>
            <div className="kpi-value" style={{ fontSize: 'var(--font-2xl)' }}>
              {debts.filter((d) => d.status === 'active').length}
            </div>
            <div className="kpi-icon">
              <TrendingDown size={20} />
            </div>
          </div>
        </div>
      )}

      {debts.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="Sin deudas registradas"
          description="¡Excelente! O registra tus deudas para hacer un seguimiento inteligente."
          action={
            <button className="btn btn-primary" onClick={() => {
              setEditingDebt(null);
              setForm({
                creditorName: '',
                originalAmount: '',
                currentBalance: '',
                interestRate: '',
                monthlyPayment: '',
                currency: 'DOP',
                startDate: todayISO(),
              });
              setShowForm(true);
            }}>
              <Plus size={16} /> Registrar Deuda
            </button>
          }
        />
      ) : (
        <div className="grid-auto">
          {debts.map((debt) => {
            const paidPercentage =
              Number(debt.originalAmount) > 0
                ? ((Number(debt.originalAmount) - Number(debt.currentBalance)) /
                    Number(debt.originalAmount)) *
                  100
                : 0;

            const debtPayments = getPaymentsByDebt(debt.id);

            // Estimate months to pay off
            const amortization = calculateAmortization(
              Number(debt.currentBalance),
              Number(debt.interestRate) || 0,
              Number(debt.monthlyPayment)
            );
            const monthsToPayOff = amortization.length;

            return (
              <div
                key={debt.id}
                className="card"
                style={{
                  borderTop: `3px solid ${
                    debt.status === 'paid_off' ? 'var(--color-success)' : 'var(--color-debt)'
                  }`,
                  opacity: debt.status === 'paid_off' ? 0.75 : 1,
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold">{debt.creditorName}</h3>
                      <button
                        className="btn-icon"
                        onClick={() => openEditForm(debt)}
                        style={{ padding: '2px', color: 'var(--text-secondary)' }}
                        title="Editar"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        className="btn-icon"
                        onClick={() => setShowDeleteConfirm(debt.id)}
                        style={{ padding: '2px', color: 'var(--color-danger)' }}
                        title="Eliminar"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <span
                      className={`badge ${
                        debt.status === 'paid_off' ? 'badge-income' : 'badge-debt'
                      }`}
                    >
                      {debt.status === 'paid_off' ? '✅ Pagada' : '🔴 Activa'}
                    </span>
                  </div>
                  {Number(debt.interestRate) > 0 && (
                    <span className="text-sm text-muted">{debt.interestRate}% interés</span>
                  )}
                </div>

                {/* Balance info */}
                <div className="flex justify-between mb-2">
                  <span className="text-xs text-muted">Saldo restante</span>
                  <span className="font-bold amount-negative">
                    {formatCurrency(Number(debt.currentBalance), debt.currency)}
                  </span>
                </div>
                <div className="flex justify-between mb-4">
                  <span className="text-xs text-muted">Monto original</span>
                  <span className="text-sm">
                    {formatCurrency(Number(debt.originalAmount), debt.currency)}
                  </span>
                </div>

                {/* Progress */}
                <div className="progress-bar progress-good" style={{ marginBottom: 'var(--space-2)' }}>
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${Math.min(paidPercentage, 100)}%`,
                      background: 'var(--color-success)',
                    }}
                  />
                </div>
                <div className="flex justify-between mb-4">
                  <span className="text-xs text-muted">
                    {formatPercent(paidPercentage, 0)} pagado
                  </span>
                  {monthsToPayOff > 0 && debt.status === 'active' && (
                    <span className="text-xs text-muted">
                      ~{monthsToPayOff} meses restantes
                    </span>
                  )}
                </div>

                {/* Monthly payment */}
                <div
                  className="flex justify-between items-center"
                  style={{
                    padding: 'var(--space-3)',
                    background: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: 'var(--space-4)',
                  }}
                >
                  <span className="text-sm">Pago mensual</span>
                  <span className="font-bold">
                    {formatCurrency(Number(debt.monthlyPayment), debt.currency)}
                  </span>
                </div>

                {/* Payment history */}
                {debtPayments.length > 0 && (
                  <div style={{ marginBottom: 'var(--space-4)' }}>
                    <h4 className="text-xs text-muted font-semibold mb-2" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Últimos pagos
                    </h4>
                    {debtPayments.slice(-3).map((p) => (
                      <div
                        key={p.id}
                        className="flex justify-between text-sm"
                        style={{ padding: 'var(--space-1) 0' }}
                      >
                        <span className="text-muted">{formatDate(p.date)}</span>
                        <span className="amount-positive">
                          {formatCurrency(p.amount, debt.currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                {debt.status === 'active' && (
                  <button
                    className="btn btn-primary btn-sm w-full"
                    onClick={() => {
                      setShowPayment(debt.id);
                      setPaymentAmount(String(debt.monthlyPayment));
                      setPaymentDate(todayISO());
                    }}
                  >
                    <Plus size={14} /> Registrar Pago
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* New/Edit Debt Form */}
      <Modal isOpen={showForm} onClose={() => { setShowForm(false); setEditingDebt(null); }} title={editingDebt ? "Editar Deuda" : "Nueva Deuda"}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Acreedor / Nombre *</label>
            <input
              type="text"
              value={form.creditorName}
              onChange={(e) => setForm({ ...form, creditorName: e.target.value })}
              placeholder="Ej: Banco Popular, Préstamo carro..."
              required
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Monto Original *</label>
              <CurrencyInput
                value={form.originalAmount}
                onChange={(val) => setForm({ ...form, originalAmount: val })}
                placeholder="0.00"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Saldo Actual</label>
              <CurrencyInput
                value={form.currentBalance}
                onChange={(val) => setForm({ ...form, currentBalance: val })}
                placeholder="Igual al original si es nueva"
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Tasa de Interés (%)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="no-spinners"
                value={form.interestRate}
                onChange={(e) => setForm({ ...form, interestRate: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Pago Mensual *</label>
              <CurrencyInput
                value={form.monthlyPayment}
                onChange={(val) => setForm({ ...form, monthlyPayment: val })}
                placeholder="0.00"
                required
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Moneda</label>
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
              >
                <option value="DOP">RD$</option>
                <option value="USD">US$</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Fecha de Inicio</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); setEditingDebt(null); }}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              {editingDebt ? "Guardar Cambios" : "Registrar Deuda"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Payment Modal */}
      <Modal
        isOpen={!!showPayment}
        onClose={() => {
          setShowPayment(null);
          setPaymentAmount('');
        }}
        title="Registrar Pago"
      >
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Monto del Pago</label>
            <CurrencyInput
              value={paymentAmount}
              onChange={(val) => setPaymentAmount(val)}
              placeholder="0.00"
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">Fecha</label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />
          </div>
        </div>
        <div className="modal-footer">
          <button
            className="btn btn-secondary"
            onClick={() => {
              setShowPayment(null);
              setPaymentAmount('');
            }}
          >
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={() => handlePayment(showPayment)}>
            Registrar Pago
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(null)}
        onConfirm={() => {
          deleteDebt(showDeleteConfirm);
          toast.success('Deuda eliminada');
        }}
        title="Eliminar Deuda"
        message="¿Seguro que quieres eliminar esta deuda? Se borrarán todos los pagos asociados."
      />
    </div>
  );
}
