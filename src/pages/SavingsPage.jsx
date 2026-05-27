// FinTrack RD — Savings Page

import { useState, useMemo } from 'react';
import { Plus, PiggyBank, Pause, Play, TrendingUp, Gift } from 'lucide-react';
import useSavingsStore from '../stores/useSavingsStore';
import useTransactionStore from '../stores/useTransactionStore';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import { formatCurrency, formatDate, todayISO, generateId } from '../utils/formatters';
import { monthsToGoal } from '../utils/calculations';
import toast from 'react-hot-toast';

function CircularProgress({ percentage, size = 120, strokeWidth = 8, color = 'var(--accent-primary)' }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(percentage, 100) / 100) * circumference;

  return (
    <div className="circular-progress" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle
          className="circular-progress-bg"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <circle
          className="circular-progress-fill"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          stroke={color}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="circular-progress-text" style={{ fontSize: size > 100 ? 'var(--font-xl)' : 'var(--font-md)' }}>
        {Math.round(percentage)}%
      </span>
    </div>
  );
}

export default function SavingsPage() {
  const { goals, addGoal, updateGoal, deleteGoal, addContribution, togglePause, getTotalSaved } =
    useSavingsStore();
  const { addTransaction } = useTransactionStore();

  const [showForm, setShowForm] = useState(false);
  const [showContribute, setShowContribute] = useState(null);
  const [contributeAmount, setContributeAmount] = useState('');

  const [form, setForm] = useState({
    name: '',
    targetAmount: '',
    currentAmount: '0',
    targetDate: '',
    priority: 'medium',
    icon: '🎯',
    color: '#10b981',
    currency: 'DOP',
  });

  const totalSaved = useMemo(() => getTotalSaved(), [goals]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.targetAmount) return;
    addGoal(form);
    setForm({
      name: '',
      targetAmount: '',
      currentAmount: '0',
      targetDate: '',
      priority: 'medium',
      icon: '🎯',
      color: '#10b981',
      currency: 'DOP',
    });
    setShowForm(false);
    toast.success('Meta de ahorro creada');
  };

  const handleContribute = (goalId) => {
    const amount = parseFloat(contributeAmount);
    if (!amount || amount <= 0) return;

    addContribution(goalId, amount);

    // Also create a transaction
    const goal = goals.find((g) => g.id === goalId);
    addTransaction({
      date: todayISO(),
      amount: amount,
      type: 'savings',
      categoryId: '',
      description: `Abono a meta: ${goal?.name}`,
      currency: goal?.currency || 'DOP',
    });

    // Check if completed
    const updatedGoal = goals.find((g) => g.id === goalId);
    if (updatedGoal && Number(updatedGoal.currentAmount) + amount >= Number(updatedGoal.targetAmount)) {
      toast.success('🎉 ¡Felicidades! Meta completada!', { duration: 5000, icon: '🎊' });
    } else {
      toast.success(`Abono de ${formatCurrency(amount)} registrado`);
    }

    setContributeAmount('');
    setShowContribute(null);
  };

  const emojiOptions = ['🎯', '🏠', '✈️', '🚗', '💻', '📱', '👶', '🎓', '💍', '🆘', '🏖️', '🏦'];

  return (
    <div className="page-container">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Metas de Ahorro</h1>
          <p className="page-subtitle">
            Ahorro total acumulado: <span className="amount-positive">{formatCurrency(totalSaved)}</span>
          </p>
        </div>
        <button className="btn btn-primary btn-lg" onClick={() => setShowForm(true)}>
          <Plus size={18} /> Nueva Meta
        </button>
      </div>

      {goals.length === 0 ? (
        <EmptyState
          icon={PiggyBank}
          title="Sin metas de ahorro"
          description="Crea tu primera meta y empieza a ahorrar para lo que más importa."
          action={
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
              <Plus size={16} /> Crear Meta
            </button>
          }
        />
      ) : (
        <div className="grid-auto">
          {goals.map((goal) => {
            const percentage =
              Number(goal.targetAmount) > 0
                ? (Number(goal.currentAmount) / Number(goal.targetAmount)) * 100
                : 0;

            const remaining = Number(goal.targetAmount) - Number(goal.currentAmount);
            const monthsLeft = monthsToGoal(
              Number(goal.currentAmount),
              Number(goal.targetAmount),
              remaining > 0 ? remaining / 12 : 0
            );

            const statusColor =
              goal.status === 'completed'
                ? 'var(--color-success)'
                : goal.status === 'paused'
                ? 'var(--text-tertiary)'
                : goal.color || 'var(--accent-primary)';

            return (
              <div
                key={goal.id}
                className="card"
                style={{
                  opacity: goal.status === 'paused' ? 0.7 : 1,
                  borderTop: `3px solid ${statusColor}`,
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span style={{ fontSize: 'var(--font-2xl)' }}>{goal.icon}</span>
                    <div>
                      <h3 className="font-bold">{goal.name}</h3>
                      <span
                        className={`badge ${
                          goal.status === 'completed'
                            ? 'badge-income'
                            : goal.status === 'paused'
                            ? 'badge-variable'
                            : 'badge-savings'
                        }`}
                      >
                        {goal.status === 'completed'
                          ? '✅ Completada'
                          : goal.status === 'paused'
                          ? '⏸️ Pausada'
                          : '🔄 Activa'}
                      </span>
                    </div>
                  </div>
                  <CircularProgress percentage={percentage} size={90} color={statusColor} />
                </div>

                <div className="flex justify-between items-center mb-4">
                  <div>
                    <div className="text-xs text-muted">Ahorrado</div>
                    <div className="font-bold" style={{ color: statusColor }}>
                      {formatCurrency(Number(goal.currentAmount), goal.currency)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted">Meta</div>
                    <div className="font-bold">
                      {formatCurrency(Number(goal.targetAmount), goal.currency)}
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="progress-bar progress-good" style={{ marginBottom: 'var(--space-4)' }}>
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${Math.min(percentage, 100)}%`,
                      background: statusColor,
                    }}
                  />
                </div>

                {remaining > 0 && goal.status === 'active' && (
                  <p className="text-xs text-muted mb-4">
                    Faltan {formatCurrency(remaining, goal.currency)} para completar
                    {goal.targetDate && ` — Meta: ${formatDate(goal.targetDate)}`}
                  </p>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  {goal.status === 'active' && (
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1 }}
                      onClick={() => setShowContribute(goal.id)}
                    >
                      <Plus size={14} /> Abonar
                    </button>
                  )}
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => togglePause(goal.id)}
                    title={goal.status === 'paused' ? 'Reanudar' : 'Pausar'}
                  >
                    {goal.status === 'paused' ? <Play size={14} /> : <Pause size={14} />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Goal Form */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Nueva Meta de Ahorro">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nombre *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ej: Fondo de Emergencia, Viaje, Mudanza..."
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Ícono</label>
            <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
              {emojiOptions.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setForm({ ...form, icon: emoji })}
                  style={{
                    fontSize: 'var(--font-xl)',
                    padding: 'var(--space-2)',
                    borderRadius: 'var(--radius-md)',
                    background:
                      form.icon === emoji ? 'var(--accent-primary-subtle)' : 'transparent',
                    border:
                      form.icon === emoji
                        ? '2px solid var(--accent-primary)'
                        : '2px solid var(--border-primary)',
                    cursor: 'pointer',
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Monto Objetivo *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.targetAmount}
                onChange={(e) => setForm({ ...form, targetAmount: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Monto Inicial</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.currentAmount}
                onChange={(e) => setForm({ ...form, currentAmount: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Fecha Objetivo</label>
              <input
                type="date"
                value={form.targetDate}
                onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Prioridad</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
              >
                <option value="high">🔴 Alta</option>
                <option value="medium">🟡 Media</option>
                <option value="low">🟢 Baja</option>
              </select>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              Crear Meta
            </button>
          </div>
        </form>
      </Modal>

      {/* Contribute Modal */}
      <Modal
        isOpen={!!showContribute}
        onClose={() => {
          setShowContribute(null);
          setContributeAmount('');
        }}
        title="Abonar a Meta"
      >
        <div className="form-group">
          <label className="form-label">Monto a abonar</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={contributeAmount}
            onChange={(e) => setContributeAmount(e.target.value)}
            placeholder="0.00"
            autoFocus
          />
        </div>
        <div className="modal-footer">
          <button
            className="btn btn-secondary"
            onClick={() => {
              setShowContribute(null);
              setContributeAmount('');
            }}
          >
            Cancelar
          </button>
          <button
            className="btn btn-primary"
            onClick={() => handleContribute(showContribute)}
          >
            Abonar
          </button>
        </div>
      </Modal>
    </div>
  );
}
