// FinTrack RD — Plan Page

import { useState } from 'react';
import { Plus, Target, Trash2, Clock, CheckCircle2, Circle, Edit2 } from 'lucide-react';
import usePlanStore from '../stores/usePlanStore';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import { formatCurrency, formatPercent, formatDate } from '../utils/formatters';
import CurrencyInput from '../components/ui/CurrencyInput';
import toast from 'react-hot-toast';

const HORIZON_CONFIG = {
  short: { label: 'Corto Plazo', subtitle: '1-3 meses', emoji: '⚡', color: '#f59e0b' },
  medium: { label: 'Mediano Plazo', subtitle: '3-12 meses', emoji: '📅', color: '#6366f1' },
  long: { label: 'Largo Plazo', subtitle: '1+ años', emoji: '🏔️', color: '#06b6d4' },
};

const STATUS_CONFIG = {
  pending: { label: 'Pendiente', icon: Circle, color: 'var(--color-expense)', badge: 'badge-expense' },
  in_progress: { label: 'En Proceso', icon: Clock, color: 'var(--color-variable)', badge: 'badge-variable' },
  completed: { label: 'Cumplida', icon: CheckCircle2, color: 'var(--color-income)', badge: 'badge-income' },
};

export default function PlanPage() {
  const { plans, addPlan, updatePlan, deletePlan, updateStatus } = usePlanStore();
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    horizon: 'short',
    targetAmount: '',
    deadline: '',
  });

  const openEditForm = (plan) => {
    setForm({
      title: plan.title,
      description: plan.description || '',
      horizon: plan.horizon || 'short',
      targetAmount: plan.targetAmount ? plan.targetAmount.toString() : '',
      deadline: plan.deadline || '',
    });
    setEditingPlan(plan.id);
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title) return;
    
    const planData = {
      ...form,
      targetAmount: Number(form.targetAmount) || 0,
    };

    if (editingPlan) {
      updatePlan(editingPlan, planData);
      toast.success('Meta actualizada');
    } else {
      addPlan(planData);
      toast.success('Meta creada');
    }

    setForm({ title: '', description: '', horizon: 'short', targetAmount: '', deadline: '' });
    setEditingPlan(null);
    setShowForm(false);
  };

  const cycleStatus = (id, currentStatus) => {
    const order = ['pending', 'in_progress', 'completed'];
    const nextIndex = (order.indexOf(currentStatus) + 1) % order.length;
    updateStatus(id, order[nextIndex]);
  };

  const getDaysRemaining = (targetDate) => {
    if (!targetDate) return null;
    const today = new Date();
    const target = new Date(targetDate + 'T00:00:00');
    const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div className="page-container">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Plan Financiero</h1>
          <p className="page-subtitle">
            {plans.filter((p) => p.status === 'completed').length} de {plans.length} metas cumplidas
          </p>
        </div>
        {plans.length > 0 && (
          <button className="btn btn-primary btn-lg" onClick={() => {
            setEditingPlan(null);
            setForm({ title: '', description: '', horizon: 'short', targetAmount: '', deadline: '' });
            setShowForm(true);
          }}>
            <Plus size={18} /> Nueva Meta
          </button>
        )}
      </div>

      {plans.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Sin metas planificadas"
          description="Define tus metas financieras a corto, mediano y largo plazo."
          action={
            <button className="btn btn-primary" onClick={() => {
              setEditingPlan(null);
              setForm({ title: '', description: '', horizon: 'short', targetAmount: '', deadline: '' });
              setShowForm(true);
            }}>
              <Plus size={16} /> Crear Meta
            </button>
          }
        />
      ) : (
        <div className="flex flex-col gap-6">
          {Object.entries(HORIZON_CONFIG).map(([key, config]) => {
            const horizonPlans = plans.filter((p) => p.horizon === key);
            if (horizonPlans.length === 0) return null;

            return (
              <div key={key}>
                <h2
                  className="flex items-center gap-2 mb-4"
                  style={{
                    fontSize: 'var(--font-lg)',
                    fontWeight: 700,
                    color: config.color,
                  }}
                >
                  <span>{config.emoji}</span>
                  {config.label}
                  <span className="text-xs text-muted font-semibold" style={{ fontWeight: 400 }}>
                    ({config.subtitle})
                  </span>
                </h2>

                <div className="flex flex-col gap-3">
                  {horizonPlans.map((plan) => {
                    const statusConfig = STATUS_CONFIG[plan.status];
                    const StatusIcon = statusConfig.icon;
                    const daysRemaining = getDaysRemaining(plan.deadline);

                    return (
                      <div
                        key={plan.id}
                        className="card flex items-center gap-4"
                        style={{
                          padding: 'var(--space-4) var(--space-5)',
                          borderLeft: `4px solid ${statusConfig.color}`,
                          opacity: plan.status === 'completed' ? 0.75 : 1,
                        }}
                      >
                        {/* Status Icon */}
                        <div style={{ color: statusConfig.color, display: 'flex', alignItems: 'center' }}>
                          <StatusIcon size={22} />
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1 }}>
                          <h3
                            className="font-semibold text-base"
                            style={{
                              textDecoration:
                                plan.status === 'completed' ? 'line-through' : 'none',
                            }}
                          >
                            {plan.title}
                          </h3>
                          <div className="flex flex-col gap-1 mt-1">
                            {plan.targetAmount > 0 && (
                              <span className="font-semibold text-sm" style={{ color: 'var(--accent-primary)' }}>
                                Objetivo: {formatCurrency(plan.targetAmount)}
                              </span>
                            )}
                            {plan.description && (
                              <p className="text-sm text-muted" style={{ margin: 0 }}>{plan.description}</p>
                            )}
                          </div>
                        </div>

                        {/* Date & Days */}
                        {plan.deadline && (
                          <div className="text-right">
                            <div className="text-xs text-muted">{formatDate(plan.deadline)}</div>
                            {daysRemaining !== null && plan.status !== 'completed' && (
                              <div
                                className="text-xs font-semibold"
                                style={{
                                  color:
                                    daysRemaining <= 0
                                      ? 'var(--color-danger)'
                                      : daysRemaining <= 30
                                      ? 'var(--color-warning)'
                                      : 'var(--text-tertiary)',
                                }}
                              >
                                {daysRemaining <= 0
                                  ? 'Vencida'
                                  : `${daysRemaining} días`}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Status Dropdown */}
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                          <select
                            value={plan.status}
                            onChange={(e) => updateStatus(plan.id, e.target.value)}
                            className={`badge ${statusConfig.badge}`}
                            style={{
                              border: 'none',
                              cursor: 'pointer',
                              outline: 'none',
                              padding: 'var(--space-1) var(--space-6) var(--space-1) var(--space-3)',
                              fontWeight: 600,
                              fontSize: 'var(--font-xs)',
                              backgroundPosition: 'right var(--space-2) center',
                              backgroundSize: '10px',
                            }}
                          >
                            <option value="pending" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>🔴 Pendiente</option>
                            <option value="in_progress" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>🟡 En Proceso</option>
                            <option value="completed" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>✅ Cumplida</option>
                          </select>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                          <button
                            className="btn-icon"
                            onClick={() => openEditForm(plan)}
                            style={{ padding: '4px', color: 'var(--text-secondary)' }}
                            title="Editar"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            className="btn-icon"
                            onClick={() => setShowDeleteConfirm(plan.id)}
                            style={{ padding: '4px', color: 'var(--color-danger)' }}
                            title="Eliminar"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form Modal */}
      <Modal isOpen={showForm} onClose={() => { setShowForm(false); setEditingPlan(null); }} title={editingPlan ? "Editar Meta del Plan" : "Nueva Meta del Plan"}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Título *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Ej: Comprar laptop, Liquidar tarjeta, Fondo 6 meses..."
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Descripción</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Detalles opcionales..."
              rows={2}
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Horizonte</label>
              <select
                value={form.horizon}
                onChange={(e) => setForm({ ...form, horizon: e.target.value })}
              >
                <option value="short">⚡ Corto Plazo (1-3 meses)</option>
                <option value="medium">📅 Mediano Plazo (3-12 meses)</option>
                <option value="long">🏔️ Largo Plazo (1+ años)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Monto Objetivo</label>
              <CurrencyInput
                value={form.targetAmount}
                onChange={(val) => setForm({ ...form, targetAmount: val })}
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Fecha Objetivo</label>
            <input
              type="date"
              value={form.deadline}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })}
            />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); setEditingPlan(null); }}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              {editingPlan ? "Guardar Cambios" : "Crear Meta"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(null)}
        onConfirm={() => deletePlan(showDeleteConfirm)}
        title="Eliminar Meta"
        message="¿Seguro que quieres eliminar esta meta del plan?"
      />
    </div>
  );
}
