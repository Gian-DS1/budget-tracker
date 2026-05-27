// FinTrack RD — Debts Page

import { useState, useMemo } from 'react';
import { Plus, CreditCard, TrendingDown, DollarSign, Calendar } from 'lucide-react';
import useDebtStore from '../stores/useDebtStore';
import useTransactionStore from '../stores/useTransactionStore';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import { formatCurrency, formatDate, todayISO, formatPercent } from '../utils/formatters';
import { calculateAmortization } from '../utils/calculations';
import toast from 'react-hot-toast';

export default function DebtsPage() {
  const {
    debts,
    payments,
    addDebt,
    deleteDebt,
    addPayment,
    getPaymentsByDebt,
    getTotalDebt,
    getTotalMonthlyPayment,
  } = useDebtStore();
  const { addTransaction } = useTransactionStore();

  const [showForm, setShowForm] = useState(false);
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

  const totalDebt = useMemo(() => getTotalDebt(), [debts]);
  const totalMonthly = useMemo(() => getTotalMonthlyPayment(), [debts]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.creditorName || !form.originalAmount || !form.monthlyPayment) return;
    addDebt({
      ...form,
      currentBalance: form.currentBalance || form.originalAmount,
    });
    setForm({
      creditorName: '',
      originalAmount: '',
      currentBalance: '',
      interestRate: '',
      monthlyPayment: '',
      currency: 'DOP',
      startDate: todayISO(),
    });
    setShowForm(false);
    toast.success('Deuda registrada');
  };

  const handlePayment = (debtId) => {
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) return;

    addPayment(debtId, amount, paymentDate);

    // Create transaction
    const debt = debts.find((d) => d.id === debtId);
    addTransaction({
      date: paymentDate,
      amount: amount,
      type: 'debt_payment',
      categoryId: '',
      description: `Pago deuda: ${debt?.creditorName}`,
      currency: debt?.currency || 'DOP',
    });

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
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Control de Deudas</h1>
          <p className="page-subtitle">
            Deuda total: <span className="amount-negative">{formatCurrency(totalDebt)}</span>
          </p>
        </div>
        <button className="btn btn-primary btn-lg" onClick={() => setShowForm(true)}>
          <Plus size={18} /> Nueva Deuda
        </button>
      </div>

      {/* Summary */}
      {debts.length > 0 && (
        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
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
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
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
                    <h3 className="font-bold">{debt.creditorName}</h3>
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

      {/* New Debt Form */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Nueva Deuda">
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
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.originalAmount}
                onChange={(e) => setForm({ ...form, originalAmount: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Saldo Actual</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.currentBalance}
                onChange={(e) => setForm({ ...form, currentBalance: e.target.value })}
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
                value={form.interestRate}
                onChange={(e) => setForm({ ...form, interestRate: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Pago Mensual *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.monthlyPayment}
                onChange={(e) => setForm({ ...form, monthlyPayment: e.target.value })}
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
            <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              Registrar Deuda
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
            <input
              type="number"
              min="0"
              step="0.01"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
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
    </div>
  );
}
