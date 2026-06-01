// FinTrack RD — Savings Page

import { useState, useMemo } from 'react';
import { Plus, PiggyBank, Edit2, Trash2 } from 'lucide-react';
import useSavingsStore from '../stores/useSavingsStore';
import useTransactionStore from '../stores/useTransactionStore';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import CurrencyInput from '../components/ui/CurrencyInput';
import { formatCurrency, formatDate, todayISO } from '../utils/formatters';
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
  const { goals, addGoal, updateGoal, deleteGoal, addContribution, getTotalSaved } = useSavingsStore();
  const { addTransaction } = useTransactionStore();

  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showContribute, setShowContribute] = useState(null);
  const [contributeAmount, setContributeAmount] = useState('');

  const [form, setForm] = useState({
    title: '',
    targetAmount: '',
    currentAmount: '0',
    deadline: '',
    priority: 'medium',
    icon: '🎯',
    color: '#10b981',
    currency: 'DOP',
  });

  const totalSaved = useMemo(() => getTotalSaved(), [getTotalSaved]);

  const openEditForm = (goal) => {
    setForm({
      title: goal.title,
      targetAmount: goal.targetAmount.toString(),
      currentAmount: goal.currentAmount.toString(),
      deadline: goal.deadline || '',
      priority: goal.priority || 'medium',
      icon: goal.icon || '🎯',
      color: goal.color || '#10b981',
      currency: goal.currency || 'DOP',
    });
    setEditingGoal(goal.id);
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title || !form.targetAmount) return;

    const goalData = {
      ...form,
      targetAmount: Number(form.targetAmount),
      currentAmount: Number(form.currentAmount) || 0,
    };

    if (editingGoal) {
      updateGoal(editingGoal, goalData);
      toast.success('Meta de ahorro actualizada');
    } else {
      addGoal(goalData);
      toast.success('Meta de ahorro creada');
    }

    setForm({
      title: '',
      targetAmount: '',
      currentAmount: '0',
      deadline: '',
      priority: 'medium',
      icon: '🎯',
      color: '#10b981',
      currency: 'DOP',
    });
    setEditingGoal(null);
    setShowForm(false);
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
      description: `Abono a meta: ${goal?.title}`,
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
      <div className="page-header flex items-center justify-between" id="tour-savings-header">
        <div>
          <h1 className="page-title">Metas de Ahorro</h1>
          <p className="page-subtitle">
            Ahorro total acumulado: <span className="amount-positive">{formatCurrency(totalSaved)}</span>
          </p>
        </div>
        {goals.length > 0 && (
          <button className="btn btn-primary btn-lg" onClick={() => {
            setEditingGoal(null);
            setForm({
              title: '',
              targetAmount: '',
              currentAmount: '0',
              deadline: '',
              priority: 'medium',
              icon: '🎯',
              color: '#10b981',
              currency: 'DOP',
            });
            setShowForm(true);
          }}>
            <Plus size={18} /> Nueva Meta
          </button>
        )}
      </div>

      {goals.length === 0 ? (
        <EmptyState
          icon={PiggyBank}
          title="Sin metas de ahorro"
          description="Crea tu primera meta y empieza a ahorrar para lo que más importa."
          action={
            <button className="btn btn-primary" onClick={() => {
              setEditingGoal(null);
              setForm({
                title: '',
                targetAmount: '',
                currentAmount: '0',
                deadline: '',
                priority: 'medium',
                icon: '🎯',
                color: '#10b981',
                currency: 'DOP',
              });
              setShowForm(true);
            }}>
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
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold">{goal.title}</h3>
                        <button
                          className="btn-icon"
                          onClick={() => openEditForm(goal)}
                          style={{ padding: '2px', color: 'var(--text-secondary)' }}
                          title="Editar"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          className="btn-icon"
                          onClick={() => setShowDeleteConfirm(goal.id)}
                          style={{ padding: '2px', color: 'var(--color-danger)' }}
                          title="Eliminar"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <span
                        className={`badge ${
                          goal.status === 'completed'
                            ? 'badge-income'
                            : 'badge-savings'
                        }`}
                      >
                        {goal.status === 'completed'
                          ? '✅ Completada'
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
                    {goal.deadline && ` — Meta: ${formatDate(goal.deadline)}`}
                  </p>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  {goal.status === 'active' && (
                    <button
                      className="btn btn-primary btn-sm w-full"
                      onClick={() => setShowContribute(goal.id)}
                    >
                      <Plus size={14} /> Abonar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form Modal */}
      <Modal isOpen={showForm} onClose={() => { setShowForm(false); setEditingGoal(null); }} title={editingGoal ? "Editar Meta de Ahorro" : "Nueva Meta de Ahorro"}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="goal-title">Nombre *</label>
            <input
              id="goal-title"
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Ej: Fondo de Emergencia, Viaje, Mudanza..."
              required
            />
          </div>

          <div className="form-group">
            <span className="form-label" id="goal-icon-label">Ícono</span>
            <div className="flex gap-2" style={{ flexWrap: 'wrap' }} role="group" aria-labelledby="goal-icon-label">
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
              <label className="form-label" htmlFor="goal-target">Monto Objetivo *</label>
              <CurrencyInput
                id="goal-target"
                value={form.targetAmount}
                onChange={(val) => setForm({ ...form, targetAmount: val })}
                placeholder="0.00"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="goal-current">Monto Inicial</label>
              <CurrencyInput
                id="goal-current"
                value={form.currentAmount}
                onChange={(val) => setForm({ ...form, currentAmount: val })}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="goal-deadline">Fecha Objetivo</label>
              <input
                id="goal-deadline"
                type="date"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="goal-priority">Prioridad</label>
              <select
                id="goal-priority"
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
            <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); setEditingGoal(null); }}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              {editingGoal ? "Guardar Cambios" : "Crear Meta"}
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
          <label className="form-label" htmlFor="goal-contribute">Monto a abonar</label>
          <CurrencyInput
            id="goal-contribute"
            value={contributeAmount}
            onChange={(val) => setContributeAmount(val)}
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

      <ConfirmDialog
        isOpen={!!showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(null)}
        onConfirm={() => {
          deleteGoal(showDeleteConfirm);
          toast.success('Meta de ahorro eliminada');
        }}
        title="Eliminar Meta de Ahorro"
        message="¿Seguro que quieres eliminar esta meta de ahorro?"
      />
    </div>
  );
}
