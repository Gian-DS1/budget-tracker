// FinTrack — Debts Page

import { useState } from 'react';
import { Plus, CreditCard, TrendingDown, DollarSign, Edit2, Trash2 } from 'lucide-react';
import useDebtStore from '../stores/useDebtStore';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import InfoTooltip from '../components/ui/InfoTooltip';
import CurrencyInput from '../components/ui/CurrencyInput';
import { Skeleton } from '../components/ui/Skeleton';
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
    deletePayment,
    restorePayment,
    getPaymentsByDebt,
    getTotalDebt,
    getTotalMonthlyPayment,
  } = useDebtStore();
  const debtLoading = useDebtStore((s) => s.loading);

  // Esqueleto solo en carga en frío: evita que un usuario CON deudas vea
  // "Sin deudas registradas" antes de que hidrate Supabase.
  const showSkeleton = debtLoading && debts.length === 0;

  const [showForm, setShowForm] = useState(false);
  const [editingDebt, setEditingDebt] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showPayment, setShowPayment] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(todayISO());
  const [formErrors, setFormErrors] = useState({});
  const [paymentError, setPaymentError] = useState('');
  // Pago pendiente de confirmar borrado (objeto pago) y set de deudas con su
  // historial de pagos expandido (para ver más allá de los últimos 3).
  const [deletePaymentConfirm, setDeletePaymentConfirm] = useState(null);
  const [expandedHistory, setExpandedHistory] = useState({});

  const [form, setForm] = useState({
    creditorName: '',
    originalAmount: '',
    currentBalance: '',
    interestRate: '',
    monthlyPayment: '',
    currency: 'DOP',
    dueDate: '',
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
      dueDate: debt.due_date || '',
    });
    setEditingDebt(debt.id);
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validación visible en vez de un return silencioso (WCAG 3.3.1).
    const errors = {};
    if (!form.creditorName) errors.creditorName = 'Indica el acreedor o nombre.';
    if (!form.originalAmount || Number(form.originalAmount) <= 0) errors.originalAmount = 'Ingresa el monto original (> 0).';
    if (!form.monthlyPayment || Number(form.monthlyPayment) <= 0) errors.monthlyPayment = 'Ingresa el pago mensual (> 0).';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      const first = ['creditorName', 'originalAmount', 'monthlyPayment'].find((f) => errors[f]);
      const el = document.getElementById(`debt-field-${first}`);
      if (el) el.focus();
      return;
    }
    setFormErrors({});

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
      dueDate: '',
    });
    setEditingDebt(null);
    setShowForm(false);
  };

  const handlePayment = (debtId) => {
    const amount = parseFloat(paymentAmount);
    const debt = debts.find((d) => d.id === debtId);
    const balance = Number(debt?.currentBalance) || 0;

    // Validación visible del monto del pago.
    if (!amount || amount <= 0) {
      setPaymentError('Ingresa un monto mayor que 0.');
      return;
    }
    // Un pago no puede superar el saldo: registrarlo de más corrompe el saldo
    // y la transacción que se crea en paralelo. Se topa al saldo restante.
    if (amount > balance) {
      setPaymentError(`El pago supera el saldo restante (${formatCurrency(balance, debt?.currency)}). Ajústalo para liquidar la deuda.`);
      return;
    }
    setPaymentError('');

    addPayment(debtId, amount, paymentDate);

    const newBalance = balance - amount;
    if (newBalance <= 0) {
      toast.success('🎉 ¡Deuda liquidada! Felicidades!', { duration: 5000 });
    } else {
      toast.success(`Pago de ${formatCurrency(amount)} registrado`);
    }

    setPaymentAmount('');
    setShowPayment(null);
  };

  // Borra un pago (tras confirmación) revirtiendo el saldo, y ofrece deshacer.
  const handleDeletePayment = async (payment) => {
    setDeletePaymentConfirm(null);
    const res = await deletePayment(payment.id);
    if (!res.ok) return;

    // Pagos legados (sin transaction_id) no pueden borrar su transacción: se
    // avisa para no dejarlo en silencio.
    const note = res.hadTransactionLink
      ? ''
      : ' La transacción asociada se conservó.';

    toast.success(
      (t) => (
        <span className="flex items-center gap-3">
          <span>Pago eliminado.{note}</span>
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => {
              restorePayment(payment);
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

  return (
    <div className="page-container">
      <div className="page-header flex items-center justify-between" id="tour-debts-header">
        <div>
          <h1 className="page-title">Control de deudas</h1>
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
              dueDate: '',
            });
            setShowForm(true);
          }}>
            <Plus size={18} /> Nueva deuda
          </button>
        )}
      </div>

      {showSkeleton ? (
        <div role="status" aria-label="Cargando las deudas">
          <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={`sk-d-${i}`} className="kpi-card">
                <Skeleton width={120} height={12} style={{ marginBottom: 'var(--space-3)' }} />
                <Skeleton width="60%" height={26} />
              </div>
            ))}
          </div>
          <div className="grid-auto">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={`sk-dc-${i}`} className="card">
                <Skeleton width="50%" height={18} style={{ marginBottom: 'var(--space-4)' }} />
                <Skeleton width="100%" height={12} style={{ marginBottom: 'var(--space-2)' }} />
                <Skeleton width="100%" height={8} radius="var(--radius-full)" style={{ marginBottom: 'var(--space-4)' }} />
                <Skeleton width="100%" height={40} radius="var(--radius-md)" />
              </div>
            ))}
          </div>
        </div>
      ) : (
       <>
      {/* Summary */}
      {debts.length > 0 && (
        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <div className="kpi-card" style={{ '--kpi-accent': 'var(--color-debt)' }}>
            <div className="kpi-label">Deuda total</div>
            <div className="kpi-value" style={{ fontSize: 'var(--font-2xl)', color: 'var(--color-expense)' }}>
              {formatCurrency(totalDebt)}
            </div>
            <div className="kpi-icon" style={{ background: 'var(--color-debt-bg)', color: 'var(--color-debt)' }}>
              <CreditCard size={20} />
            </div>
          </div>
          <div className="kpi-card" style={{ '--kpi-accent': 'var(--color-variable)' }}>
            <div className="kpi-label">Pago mensual Total</div>
            <div className="kpi-value" style={{ fontSize: 'var(--font-2xl)' }}>
              {formatCurrency(totalMonthly)}
            </div>
            <div className="kpi-icon" style={{ background: 'var(--color-variable-bg)', color: 'var(--color-variable)' }}>
              <DollarSign size={20} />
            </div>
          </div>
          <div className="kpi-card" style={{ '--kpi-accent': 'var(--accent-secondary)' }}>
            <div className="kpi-label">Deudas activas</div>
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
                dueDate: '',
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
                    <span className="text-xs text-muted flex items-center gap-1">
                      ~{monthsToPayOff} meses restantes
                      <InfoTooltip text="Estimado según tu saldo actual, la tasa de interés y tu pago mensual, asumiendo que mantienes ese pago cada mes." label="Cómo se estiman los meses restantes" />
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

                {/* Payment history (más recientes primero; expandible) */}
                {debtPayments.length > 0 && (() => {
                  const ordered = [...debtPayments].reverse();
                  const isExpanded = !!expandedHistory[debt.id];
                  const visible = isExpanded ? ordered : ordered.slice(0, 3);
                  return (
                    <div style={{ marginBottom: 'var(--space-4)' }}>
                      <h4 className="text-xs text-muted font-semibold mb-2" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {isExpanded ? `Historial de pagos (${ordered.length})` : 'Últimos pagos'}
                      </h4>
                      {visible.map((p) => (
                        <div
                          key={p.id}
                          className="flex justify-between items-center text-sm"
                          style={{ padding: 'var(--space-1) 0', gap: 'var(--space-2)' }}
                        >
                          <span className="text-muted">{formatDate(p.date)}</span>
                          <span className="flex items-center gap-2" style={{ flexShrink: 0 }}>
                            <span className="amount-positive">
                              {formatCurrency(p.amount, debt.currency)}
                            </span>
                            <button
                              className="btn-icon"
                              onClick={() => setDeletePaymentConfirm(p)}
                              title="Eliminar pago"
                              aria-label={`Eliminar pago del ${formatDate(p.date)} por ${formatCurrency(p.amount, debt.currency)}`}
                              style={{ padding: '2px', color: 'var(--color-danger)' }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </span>
                        </div>
                      ))}
                      {ordered.length > 3 && (
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setExpandedHistory((prev) => ({ ...prev, [debt.id]: !isExpanded }))}
                          style={{ marginTop: 'var(--space-2)', padding: '2px 0' }}
                        >
                          {isExpanded ? 'Ver menos' : `Ver todos (${ordered.length})`}
                        </button>
                      )}
                    </div>
                  );
                })()}

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
                    <Plus size={14} /> Registrar pago
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
       </>
      )}

      {/* New/Edit Debt Form */}
      <Modal isOpen={showForm} onClose={() => { setShowForm(false); setEditingDebt(null); setFormErrors({}); }} title={editingDebt ? "Editar Deuda" : "Nueva deuda"}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="debt-field-creditorName">Acreedor / Nombre *</label>
            <input
              id="debt-field-creditorName"
              type="text"
              value={form.creditorName}
              onChange={(e) => {
                setForm({ ...form, creditorName: e.target.value });
                if (formErrors.creditorName) setFormErrors((p) => ({ ...p, creditorName: undefined }));
              }}
              placeholder="Ej: Banco Popular, Préstamo carro..."
              required
              aria-invalid={!!formErrors.creditorName}
              aria-describedby={formErrors.creditorName ? 'debt-err-creditorName' : undefined}
            />
            {formErrors.creditorName && <p className="form-error" id="debt-err-creditorName">{formErrors.creditorName}</p>}
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="debt-field-originalAmount">Monto original *</label>
              <CurrencyInput
                id="debt-field-originalAmount"
                value={form.originalAmount}
                onChange={(val) => {
                  setForm({ ...form, originalAmount: val });
                  if (formErrors.originalAmount) setFormErrors((p) => ({ ...p, originalAmount: undefined }));
                }}
                placeholder="0.00"
                required
              />
              {formErrors.originalAmount && <p className="form-error" id="debt-err-originalAmount">{formErrors.originalAmount}</p>}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="debt-field-currentBalance">Saldo actual</label>
              <CurrencyInput
                id="debt-field-currentBalance"
                value={form.currentBalance}
                onChange={(val) => setForm({ ...form, currentBalance: val })}
                placeholder="Igual al original si es nueva"
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="debt-field-interestRate">Tasa de interés (%)</label>
              <input
                id="debt-field-interestRate"
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
              <label className="form-label" htmlFor="debt-field-monthlyPayment">Pago mensual *</label>
              <CurrencyInput
                id="debt-field-monthlyPayment"
                value={form.monthlyPayment}
                onChange={(val) => {
                  setForm({ ...form, monthlyPayment: val });
                  if (formErrors.monthlyPayment) setFormErrors((p) => ({ ...p, monthlyPayment: undefined }));
                }}
                placeholder="0.00"
                required
              />
              {formErrors.monthlyPayment && <p className="form-error" id="debt-err-monthlyPayment">{formErrors.monthlyPayment}</p>}
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="debt-field-currency">Moneda</label>
              <select
                id="debt-field-currency"
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
              >
                <option value="DOP">RD$</option>
                <option value="USD">US$</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="debt-field-dueDate">Fecha de pago</label>
              <input
                id="debt-field-dueDate"
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
              <p className="text-xs text-muted" style={{ marginTop: 'var(--space-1)' }}>
                Para recibir un aviso en la 🔔 cuando se acerque.
              </p>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); setEditingDebt(null); setFormErrors({}); }}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              {editingDebt ? "Guardar cambios" : "Registrar Deuda"}
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
          setPaymentError('');
        }}
        title="Registrar pago"
      >
        {(() => {
          const payingDebt = debts.find((d) => d.id === showPayment);
          return payingDebt ? (
            <p className="text-sm text-muted mb-4">
              Saldo restante: <strong style={{ color: 'var(--text-primary)' }}>{formatCurrency(Number(payingDebt.currentBalance), payingDebt.currency)}</strong>
            </p>
          ) : null;
        })()}
        <div className="form-row">
          <div className="form-group">
            <label className="form-label" htmlFor="debt-field-payment">Monto del pago</label>
            <CurrencyInput
              id="debt-field-payment"
              value={paymentAmount}
              onChange={(val) => {
                setPaymentAmount(val);
                if (paymentError) setPaymentError('');
              }}
              placeholder="0.00"
              autoFocus
            />
            {paymentError && <p className="form-error" id="debt-err-payment">{paymentError}</p>}
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="debt-field-paymentDate">Fecha</label>
            <input
              id="debt-field-paymentDate"
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
              setPaymentError('');
            }}
          >
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={() => handlePayment(showPayment)}>
            Registrar pago
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
        title="Eliminar deuda"
        message="¿Seguro que quieres eliminar esta deuda? Se borrarán todos los pagos asociados."
      />

      <ConfirmDialog
        isOpen={!!deletePaymentConfirm}
        onClose={() => setDeletePaymentConfirm(null)}
        onConfirm={() => handleDeletePayment(deletePaymentConfirm)}
        title="Eliminar pago"
        message={
          deletePaymentConfirm
            ? `Se eliminará el pago de ${formatCurrency(deletePaymentConfirm.amount)} del ${formatDate(deletePaymentConfirm.date)} y se devolverá ese monto al saldo de la deuda. Podrás deshacerlo enseguida.`
            : ''
        }
      />
    </div>
  );
}
