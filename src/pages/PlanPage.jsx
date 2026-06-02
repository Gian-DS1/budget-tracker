// FinTrack — Plan Page

import { useState, useMemo } from 'react';
import { Plus, Target, Trash2, Clock, CheckCircle2, Circle, Edit2, Sparkles, AlertTriangle, TrendingUp, ShieldCheck } from 'lucide-react';
import usePlanStore from '../stores/usePlanStore';
import useTransactionStore from '../stores/useTransactionStore';
import useDebtStore from '../stores/useDebtStore';
import useSavingsStore from '../stores/useSavingsStore';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import InfoTooltip from '../components/ui/InfoTooltip';
import { formatCurrency, formatDate } from '../utils/formatters';
import { getMonthlySavingCapacity } from '../utils/calculations';
import CurrencyInput from '../components/ui/CurrencyInput';
import toast from 'react-hot-toast';

const HORIZON_CONFIG = {
  short: { label: 'Corto plazo', subtitle: '1-3 meses', emoji: '⚡', color: 'var(--color-variable)' },
  medium: { label: 'Mediano plazo', subtitle: '3-12 meses', emoji: '📅', color: 'var(--color-fixed)' },
  long: { label: 'Largo plazo', subtitle: '1+ años', emoji: '🏔️', color: 'var(--color-savings)' },
};

const STATUS_CONFIG = {
  pending: { label: 'Pendiente', icon: Circle, color: 'var(--color-expense)', badge: 'badge-expense' },
  in_progress: { label: 'En proceso', icon: Clock, color: 'var(--color-variable)', badge: 'badge-variable' },
  completed: { label: 'Cumplida', icon: CheckCircle2, color: 'var(--color-income)', badge: 'badge-income' },
};

export default function PlanPage() {
  const { plans, addPlan, updatePlan, deletePlan, updateStatus } = usePlanStore();
  const transactions = useTransactionStore((s) => s.transactions);
  const debts = useDebtStore((s) => s.debts);
  const getTotalDebt = useDebtStore((s) => s.getTotalDebt);
  const getTotalSaved = useSavingsStore((s) => s.getTotalSaved);
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    horizon: 'short',
    targetAmount: '',
    currentAmount: '',
    deadline: '',
  });

  const openEditForm = (plan) => {
    setForm({
      title: plan.title,
      description: plan.description || '',
      horizon: plan.horizon || 'short',
      targetAmount: plan.targetAmount ? plan.targetAmount.toString() : '',
      currentAmount: plan.currentAmount ? plan.currentAmount.toString() : '',
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
      currentAmount: Number(form.currentAmount) || 0,
    };

    if (editingPlan) {
      updatePlan(editingPlan, planData);
      toast.success('Meta actualizada');
    } else {
      addPlan(planData);
      toast.success('Meta creada');
    }

    setForm({ title: '', description: '', horizon: 'short', targetAmount: '', currentAmount: '', deadline: '' });
    setEditingPlan(null);
    setShowForm(false);
  };



  const getDaysRemaining = (targetDate) => {
    if (!targetDate) return null;
    const today = new Date();
    const target = new Date(targetDate + 'T00:00:00');
    const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
    return diff;
  };

  // ─── Resumen inteligente ──────────────────────────────────────
  // Cruza datos reales de transacciones, deudas y ahorros para dar
  // recomendaciones objetivas sobre la viabilidad del plan.
  const smart = useMemo(() => {
    const cap = getMonthlySavingCapacity(transactions, new Date(), 3);
    const totalDebt = getTotalDebt();
    const totalSaved = getTotalSaved();
    const maxInterest = debts
      .filter((d) => d.status === 'active')
      .reduce((mx, d) => Math.max(mx, Number(d.interestRate) || 0), 0);

    // Cuánto piden por mes las metas activas con plazo y monto objetivo.
    let requiredMonthly = 0;
    for (const p of plans) {
      if (p.status === 'completed') continue;
      const target = Number(p.targetAmount) || 0;
      if (target <= 0) continue;
      const remaining = Math.max(0, target - (Number(p.currentAmount) || 0));
      if (remaining <= 0) continue;
      const days = getDaysRemaining(p.deadline);
      const months = days && days > 0 ? Math.max(1, Math.ceil(days / 30.44)) : 1;
      requiredMonthly += remaining / months;
    }

    const margin = cap.capacity - requiredMonthly;
    const emergencyTarget = cap.avgExpense * 3;

    const insights = [];
    if (cap.monthsCounted === 0) {
      insights.push({ tone: 'info', text: 'Registra algunas transacciones para estimar tu capacidad de ahorro real y darte recomendaciones.' });
    } else {
      if (cap.capacity <= 0) {
        insights.push({ tone: 'danger', text: `En promedio tus gastos igualan o superan tus ingresos (≈ ${formatCurrency(cap.avgExpense)}/mes en gastos vs ${formatCurrency(cap.avgIncome)}/mes en ingresos). Libera flujo antes de comprometer metas.` });
      } else if (requiredMonthly > cap.capacity) {
        insights.push({ tone: 'warning', text: `Tus metas activas piden ${formatCurrency(requiredMonthly)}/mes, pero tu capacidad estimada es de ${formatCurrency(cap.capacity)}/mes. Extiende plazos o reduce montos para que sea realista.` });
      } else if (requiredMonthly > 0) {
        insights.push({ tone: 'success', text: `Tus metas son alcanzables con tu flujo actual: te queda un margen de ${formatCurrency(margin)}/mes después de aportar a ellas.` });
      } else {
        insights.push({ tone: 'info', text: `Tu capacidad de ahorro estimada es de ${formatCurrency(cap.capacity)}/mes. Crea metas con monto y fecha para que te calculemos el aporte ideal.` });
      }
    }

    if (totalDebt > 0 && maxInterest >= 15) {
      insights.push({ tone: 'warning', text: `Tienes deuda activa a una tasa de hasta ${maxInterest}%. Matemáticamente conviene priorizar pagarla antes que metas de ahorro no urgentes (ahorras más en intereses de lo que rendiría el ahorro).` });
    }

    if (cap.monthsCounted > 0 && cap.avgExpense > 0 && totalSaved < emergencyTarget) {
      insights.push({ tone: 'info', text: `Fondo de emergencia recomendado: ${formatCurrency(emergencyTarget)} (3 meses de gastos). Llevas ${formatCurrency(totalSaved)} ahorrado.` });
    }

    return { cap, requiredMonthly, margin, insights };
  }, [transactions, plans, debts, getTotalDebt, getTotalSaved]);

  const toneStyles = {
    success: { color: 'var(--color-success)', bg: 'var(--color-income-bg)' },
    warning: { color: 'var(--color-warning)', bg: 'rgba(245, 158, 11, 0.12)' },
    danger: { color: 'var(--color-danger)', bg: 'var(--color-expense-bg)' },
    info: { color: 'var(--color-info)', bg: 'rgba(59, 130, 246, 0.12)' },
  };

  return (
    <div className="page-container">
      <div className="page-header flex items-center justify-between" id="tour-plan-header">
        <div>
          <h1 className="page-title">Plan financiero</h1>
          <p className="page-subtitle">
            {plans.filter((p) => p.status === 'completed').length} de {plans.length} metas cumplidas
          </p>
        </div>
        {plans.length > 0 && (
          <button className="btn btn-primary btn-lg" onClick={() => {
            setEditingPlan(null);
            setForm({ title: '', description: '', horizon: 'short', targetAmount: '', currentAmount: '', deadline: '' });
            setShowForm(true);
          }}>
            <Plus size={18} /> Nueva meta
          </button>
        )}
      </div>

      {/* Resumen inteligente */}
      {(transactions.length > 0 || plans.length > 0) && (
        <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
          <div className="card-header">
            <h3 className="card-title flex items-center gap-2">
              <Sparkles size={18} style={{ color: 'var(--accent-primary)' }} /> Resumen inteligente
            </h3>
          </div>

          <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
            <div className="kpi-card" style={{ '--kpi-accent': 'var(--color-income)' }}>
              <div className="kpi-label flex items-center gap-1"><TrendingUp size={12} /> Capacidad de ahorro</div>
              <div className="kpi-value" style={{ fontSize: 'clamp(0.95rem, 1.7vw, 1.25rem)', color: smart.cap.capacity > 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                {formatCurrency(smart.cap.capacity)}<span className="text-xs text-muted">/mes</span>
              </div>
              <div className="text-xs text-muted mt-2">
                {smart.cap.monthsCounted > 0 ? `Promedio de ${smart.cap.monthsCounted} mes(es)` : 'Sin datos suficientes'}
              </div>
            </div>
            <div className="kpi-card" style={{ '--kpi-accent': 'var(--accent-primary)' }}>
              <div className="kpi-label flex items-center gap-1"><Target size={12} /> Requerido por metas</div>
              <div className="kpi-value" style={{ fontSize: 'clamp(0.95rem, 1.7vw, 1.25rem)' }}>
                {formatCurrency(smart.requiredMonthly)}<span className="text-xs text-muted">/mes</span>
              </div>
              <div className="text-xs text-muted mt-2">Suma de aportes de metas activas</div>
            </div>
            <div className="kpi-card" style={{ '--kpi-accent': smart.margin >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
              <div className="kpi-label flex items-center gap-1"><ShieldCheck size={12} /> Margen disponible</div>
              <div className="kpi-value" style={{ fontSize: 'clamp(0.95rem, 1.7vw, 1.25rem)', color: smart.margin >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                {formatCurrency(smart.margin)}<span className="text-xs text-muted">/mes</span>
              </div>
              <div className="text-xs text-muted mt-2">Capacidad menos lo que piden tus metas</div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {smart.insights.map((ins, idx) => {
              const ts = toneStyles[ins.tone] || toneStyles.info;
              const Icon = ins.tone === 'success' ? CheckCircle2 : ins.tone === 'danger' || ins.tone === 'warning' ? AlertTriangle : Sparkles;
              return (
                <div key={idx} className="flex items-start gap-3" style={{ padding: 'var(--space-3)', background: ts.bg, borderRadius: 'var(--radius-md)', border: `1px solid ${ts.color}` }}>
                  <Icon size={16} style={{ color: ts.color, flexShrink: 0, marginTop: 2 }} />
                  <span className="text-sm">{ins.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {plans.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Sin metas planificadas"
          description="Define tus metas financieras a corto, mediano y largo plazo."
          action={
            <button className="btn btn-primary" onClick={() => {
              setEditingPlan(null);
              setForm({ title: '', description: '', horizon: 'short', targetAmount: '', currentAmount: '', deadline: '' });
              setShowForm(true);
            }}>
              <Plus size={16} /> Crear meta
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
                    const monthsRemaining = daysRemaining > 0 ? Math.max(1, Math.ceil(daysRemaining / 30.44)) : 0;
                    
                    const tAmount = Number(plan.targetAmount) || 0;
                    const cAmount = Number(plan.currentAmount) || 0;
                    const remainingAmount = Math.max(0, tAmount - cAmount);
                    const progress = tAmount > 0 ? Math.min(100, Math.round((cAmount / tAmount) * 100)) : 0;
                    const suggestedMonthly = monthsRemaining > 0 ? (remainingAmount / monthsRemaining) : 0;

                    return (
                      <div
                        key={plan.id}
                        className="card flex items-center gap-4"
                        style={{
                          padding: 'var(--space-4) var(--space-5)',
                          borderTop: `3px solid ${statusConfig.color}`,
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
                            {tAmount > 0 && (
                              <div className="flex flex-col gap-2 mt-2">
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted">Ahorro: {formatCurrency(cAmount)}</span>
                                  <span className="font-bold" style={{ color: 'var(--accent-primary)' }}>Meta: {formatCurrency(tAmount)}</span>
                                </div>
                                <div className="progress-bar progress-good" style={{ height: '6px' }}>
                                  <div className="progress-bar-fill" style={{ width: `${progress}%`, background: 'var(--color-success)' }} />
                                </div>
                                
                                {plan.status !== 'completed' && daysRemaining > 0 && suggestedMonthly > 0 && (
                                  <div className="text-xs" style={{ 
                                    padding: 'var(--space-2)', 
                                    background: 'var(--bg-secondary)', 
                                    borderRadius: 'var(--radius-sm)',
                                    display: 'inline-block',
                                    marginTop: 'var(--space-1)'
                                  }}>
                                    💡 Necesitas ahorrar <span className="font-bold text-primary">{formatCurrency(suggestedMonthly)}</span>/mes por los próximos {monthsRemaining} meses.
                                  </div>
                                )}
                              </div>
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
                            <option value="in_progress" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>🟡 En proceso</option>
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
      <Modal isOpen={showForm} onClose={() => { setShowForm(false); setEditingPlan(null); }} title={editingPlan ? "Editar meta del plan" : "Nueva meta del plan"}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="plan-title">Nombre de la Meta *</label>
            <input
              id="plan-title"
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Ej: Comprar laptop, Liquidar tarjeta, Fondo 6 meses..."
              required
            />
            <div className="text-xs text-muted mt-2">
              Ej: "Viaje a Punta Cana", "Pago inicial moto", "Emergencias"
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="plan-description">Descripción (opcional)</label>
            <textarea
              id="plan-description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Detalles opcionales de por qué esta meta es importante..."
              rows={2}
            />
            <div className="text-xs text-muted mt-2">
              Añade contexto personal para recordar por qué vale la pena esta meta.
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="plan-horizon">Horizonte <InfoTooltip text="Corto: menos de 3 meses. Mediano: 3-12 meses. Largo: 1+ años." label="Ayuda sobre horizontes" /></label>
              <select
                id="plan-horizon"
                value={form.horizon}
                onChange={(e) => setForm({ ...form, horizon: e.target.value })}
              >
                <option value="short">⚡ Corto plazo (1-3 meses)</option>
                <option value="medium">📅 Mediano plazo (3-12 meses)</option>
                <option value="long">🏔️ Largo plazo (1+ años)</option>
              </select>
              <div className="text-xs text-muted mt-2">
                Agrupa tus metas por escala de tiempo. Define la fecha objetivo para que podamos calcular cuánto necesitas ahorrar cada mes.
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="plan-target">Monto objetivo *</label>
              <CurrencyInput
                id="plan-target"
                value={form.targetAmount}
                onChange={(val) => setForm({ ...form, targetAmount: val })}
                placeholder="0.00"
              />
              <div className="text-xs text-muted mt-2">
                Cuánto dinero necesitas alcanzar en total.
              </div>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="plan-current">Ahorro actual</label>
              <CurrencyInput
                id="plan-current"
                value={form.currentAmount}
                onChange={(val) => setForm({ ...form, currentAmount: val })}
                placeholder="0.00"
              />
              <div className="text-xs text-muted mt-2">
                Dinero que ya has reservado para esta meta (opcional).
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="plan-deadline">Fecha objetivo *</label>
              <input
                id="plan-deadline"
                type="date"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              />
              <div className="text-xs text-muted mt-2">
                Cuándo quieres alcanzar esta meta. Usaremos esto para calcular tu aporte mensual.
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); setEditingPlan(null); }}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              {editingPlan ? "Guardar Cambios" : "Crear meta"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(null)}
        onConfirm={() => deletePlan(showDeleteConfirm)}
        title="Eliminar meta"
        message="¿Seguro que quieres eliminar esta meta del plan?"
      />
    </div>
  );
}
