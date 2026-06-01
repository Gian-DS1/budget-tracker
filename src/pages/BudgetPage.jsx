// FinTrack RD — Budget Page

import { useState, useMemo, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Sparkles,
} from 'lucide-react';
import useBudgetStore from '../stores/useBudgetStore';
import useTransactionStore from '../stores/useTransactionStore';
import useCategoryStore from '../stores/useCategoryStore';
import useDebtStore from '../stores/useDebtStore';

import CurrencyInput from '../components/ui/CurrencyInput';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import InfoTooltip from '../components/ui/InfoTooltip';
import { Skeleton, SkeletonTable } from '../components/ui/Skeleton';
import { formatCurrency, formatPercent } from '../utils/formatters';
import { calculateBudgetProgress, getProgressStatus, sumAmounts, getBudgetSummary, getAccumulatedBalance, getBudgetSuggestions } from '../utils/calculations';
import { MONTHS_ES } from '../utils/constants';
import useRateStore from '../stores/useRateStore';
import toast from 'react-hot-toast';

// Local state input that only persists on blur (avoids upsert on every keystroke)
function BudgetEstimatedInput({ initialValue, onSave }) {
  const [localValue, setLocalValue] = useState(
    initialValue ? initialValue.toString() : ''
  );

  const handleChange = (val) => {
    setLocalValue(val);
  };

  const handleBlur = (finalVal) => {
    onSave(finalVal !== undefined && finalVal !== null ? finalVal : localValue);
  };

  return (
    <CurrencyInput
      value={localValue}
      onChange={handleChange}
      onBlurCallback={handleBlur}
      placeholder="0.00"
      style={{
        width: 120,
        textAlign: 'right',
        padding: 'var(--space-2) var(--space-3)',
        fontSize: 'var(--font-sm)',
      }}
    />
  );
}

// Progress display for an accumulative category (sinking fund): shows the pot
// (available of accumulated) instead of the monthly budget progress.
function PotProgress({ pot }) {
  const pct = pot.budgeted > 0 ? (pot.spent / pot.budgeted) * 100 : 0;
  const ok = pot.available >= 0;
  return (
    <div>
      <div className={`progress-bar progress-${ok ? 'good' : 'danger'}`}>
        <div className="progress-bar-fill" style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <div className="text-xs mt-1" style={{ color: ok ? 'var(--color-success)' : 'var(--color-danger)' }}>
        Bote: {formatCurrency(pot.available)} <span className="text-muted">de {formatCurrency(pot.budgeted)} acumulado</span>
      </div>
    </div>
  );
}

export default function BudgetPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const budgets = useBudgetStore((state) => state.budgets);
  const budgetLoading = useBudgetStore((state) => state.loading);
  const { setBudget, copyBudgetFromPreviousMonth, bulkSetBudgets } = useBudgetStore();
  const { transactions } = useTransactionStore();
  const { categories, updateCategory } = useCategoryStore();

  // Esqueleto solo en carga en frío (cargando y sin presupuestos en caché). Evita
  // mostrar el falso "Por Asignar: 0 / ¡Presupuesto perfecto!" antes de hidratar.
  const showSkeleton = budgetLoading && budgets.length === 0;

  const [configCat, setConfigCat] = useState(null);
  const [configForm, setConfigForm] = useState({ isAccumulative: false, accumulationStart: '' });
  const [showSuggestConfirm, setShowSuggestConfirm] = useState(false);
  const [showCopyConfirm, setShowCopyConfirm] = useState(false);
  // Cambia al aplicar operaciones masivas (copiar/sugerir) para remontar los
  // inputs y que reflejen los nuevos montos al instante.
  const [refreshKey, setRefreshKey] = useState(0);

  const debts = useDebtStore((s) => s.debts);
  const payments = useDebtStore((s) => s.payments);
  const getTotalMonthlyPayment = useDebtStore((s) => s.getTotalMonthlyPayment);
  const fxRate = useRateStore((s) => s.getRate());


  const debtPlanned = getTotalMonthlyPayment();

  const debtPaid = useMemo(() => {
    return payments.reduce((sum, p) => {
      const d = new Date(p.date + 'T00:00:00');
      if (d.getFullYear() !== year || d.getMonth() !== month) return sum;
      const debt = debts.find((dd) => dd.id === p.debtId);
      const val = Number(p.amount) || 0;
      return sum + (debt && debt.currency === 'USD' ? val * fxRate : val);
    }, 0);
  }, [payments, debts, year, month, fxRate]);

  const monthBudgets = useMemo(() => {
    return budgets.filter((b) => b.year === year && b.month === month);
  }, [budgets, year, month]);

  const monthTransactions = useMemo(
    () =>
      transactions.filter((t) => {
        const d = new Date(t.date + 'T00:00:00');
        return d.getFullYear() === year && d.getMonth() === month;
      }),
    [transactions, year, month]
  );

  // Build budget rows for each active category
  const budgetRows = useMemo(() => {
    const activeCategories = categories.filter((c) => c.isActive);

    return activeCategories.map((cat) => {
      const budget = monthBudgets.find((b) => b.categoryId === cat.id);
      const estimated = budget ? budget.estimatedAmount : 0;

      const catTransactions = monthTransactions.filter((t) => t.categoryId === cat.id);
      const actual = sumAmounts(catTransactions);

      const progress = calculateBudgetProgress(actual, estimated);

      // For income, exceeding the target is good (more money in); for
      // expenses/savings, staying under budget is good.
      const isIncome = cat.type === 'income';
      const difference = isIncome ? actual - estimated : estimated - actual;
      const status = isIncome
        ? getProgressStatus(progress >= 100 ? 0 : 100 - progress)
        : getProgressStatus(progress);

      return {
        category: cat,
        estimated,
        actual,
        progress,
        difference,
        status,
        budgetId: budget?.id,
      };
    });
  }, [categories, monthBudgets, monthTransactions]);

  const summary = useMemo(
    () =>
      getBudgetSummary({
        monthTransactions,
        monthBudgets,
        categories,
        debtPlanned,
        debtPaid,
      }),
    [monthTransactions, monthBudgets, categories, debtPlanned, debtPaid]
  );

  const accumulatedById = useMemo(() => {
    const map = {};
    categories.forEach((c) => {
      if (c.isAccumulative) {
        map[c.id] = getAccumulatedBalance({
          categoryId: c.id,
          accumulationStart: c.accumulationStart,
          budgets,
          transactions,
          uptoYear: year,
          uptoMonth: month,
        });
      }
    });
    return map;
  }, [categories, budgets, transactions, year, month]);

  // Summaries
  const incomeRows = budgetRows.filter((r) => r.category.type === 'income');
  const expenseRows = budgetRows.filter(
    (r) =>
      r.category.type === 'fixed_expense' ||
      r.category.type === 'variable_expense'
  );
  const savingsRows = budgetRows.filter((r) => r.category.type === 'savings');

  const totalIncomeEstimated = incomeRows.reduce((s, r) => s + r.estimated, 0);
  const totalIncomeActual = incomeRows.reduce((s, r) => s + r.actual, 0);
  const totalExpenseEstimated = expenseRows.reduce((s, r) => s + r.estimated, 0);
  const totalExpenseActual = expenseRows.reduce((s, r) => s + r.actual, 0);
  const totalSavingsEstimated = savingsRows.reduce((s, r) => s + r.estimated, 0);
  const totalSavingsActual = savingsRows.reduce((s, r) => s + r.actual, 0);

  const balanceEstimated = summary.porAsignar;
  const balanceActual = totalIncomeActual - totalExpenseActual - totalSavingsActual;

  const navigateMonth = (direction) => {
    let newMonth = month + direction;
    let newYear = year;
    if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    } else if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    }
    setMonth(newMonth);
    setYear(newYear);
  };

  const handleCopyPrevious = async () => {
    const success = await copyBudgetFromPreviousMonth(year, month);
    if (success) {
      setRefreshKey((k) => k + 1);
      toast.success('Presupuesto copiado del mes anterior');
    } else {
      toast.error('No hay presupuesto en el mes anterior');
    }
  };

  const handleAutoSuggest = async () => {
    const suggestions = getBudgetSuggestions(transactions, categories, year, month, 3);
    if (suggestions.length === 0) {
      toast.error('No hay suficiente historial (últimos 3 meses) para sugerir un presupuesto');
      return;
    }
    const applied = await bulkSetBudgets(year, month, suggestions);
    if (applied > 0) {
      setRefreshKey((k) => k + 1);
      toast.success(`Presupuesto sugerido aplicado a ${applied} categoría${applied === 1 ? '' : 's'}`);
    }
  };

  const handleEstimatedChange = useCallback((categoryId, value) => {
    const amount = parseFloat(value) || 0;
    setBudget(categoryId, year, month, amount);
  }, [setBudget, year, month]);

  const openConfig = (cat) => {
    const d = new Date();
    setConfigForm({
      isAccumulative: !!cat.isAccumulative,
      accumulationStart: cat.accumulationStart || `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
    });
    setConfigCat(cat);
  };

  const handleSaveConfig = () => {
    updateCategory(configCat.id, {
      isAccumulative: configForm.isAccumulative,
      accumulationStart: configForm.isAccumulative ? configForm.accumulationStart : null,
    });
    setConfigCat(null);
  };

  const renderSection = (title, icon, rows) => {
    if (rows.length === 0) return null;


    const allRows = rows;

    return (
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="card-header">
          <h3 className="card-title flex items-center gap-2">
            {icon} {title}
          </h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Categoría</th>
                <th style={{ textAlign: 'right', width: 150, whiteSpace: 'nowrap' }}>Estimado</th>
                <th style={{ textAlign: 'right', width: 150, whiteSpace: 'nowrap' }}>Actual</th>
                <th style={{ textAlign: 'right', width: 160, whiteSpace: 'nowrap' }}>Diferencia</th>
                <th style={{ width: 200 }}>Progreso</th>
              </tr>
            </thead>
            <tbody>
              {allRows.map((row) => (
                <tr key={row.category.id}>
                  <td>
                    <span className="flex items-center gap-2">
                      <span>{row.category.icon}</span>
                      <span className="font-semibold">{row.category.name}</span>
                      {row.category.isAccumulative && (
                        <span className="badge badge-savings" title="Sobre acumulativo">🔁 Sobre</span>
                      )}
                      {row.category.type !== 'income' && (
                        <button
                          className="btn-icon"
                          title="Configurar sobre acumulativo"
                          onClick={() => openConfig(row.category)}
                          style={{ marginLeft: 'auto' }}
                        >
                          <PiggyBank size={14} />
                        </button>
                      )}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <BudgetEstimatedInput
                      key={`${row.category.id}-${year}-${month}-${refreshKey}`}
                      initialValue={row.estimated}
                      onSave={(value) => handleEstimatedChange(row.category.id, value)}
                    />
                  </td>
                  <td
                    style={{ textAlign: 'right', whiteSpace: 'nowrap' }}
                    className={row.actual > 0 ? 'font-semibold' : 'text-muted'}
                  >
                    {formatCurrency(row.actual)}
                  </td>
                  <td
                    style={{ textAlign: 'right', whiteSpace: 'nowrap' }}
                    className={
                      row.difference > 0
                        ? 'amount-positive'
                        : row.difference < 0
                        ? 'amount-negative'
                        : 'text-muted'
                    }
                  >
                    {row.estimated > 0 || row.actual > 0 ? formatCurrency(row.difference) : '—'}
                  </td>
                  <td>
                    {row.category.isAccumulative && accumulatedById[row.category.id] ? (
                      <PotProgress pot={accumulatedById[row.category.id]} />
                    ) : row.estimated > 0 ? (
                      <div className="flex items-center gap-2">
                        <div className={`progress-bar progress-${row.status}`} style={{ flex: 1 }}>
                          <div
                            className="progress-bar-fill"
                            style={{ width: `${Math.min(row.progress, 100)}%` }}
                          />
                        </div>
                        <span
                          className="text-xs font-semibold"
                          style={{
                            color: `var(--progress-${row.status})`,
                            minWidth: 40,
                            textAlign: 'right',
                          }}
                        >
                          {formatPercent(row.progress, 0)}
                        </span>
                      </div>
                    ) : row.actual > 0 ? (
                      <div className="flex items-center gap-2">
                        <div className={`progress-bar progress-${row.status}`} style={{ flex: 1 }}>
                          <div
                            className="progress-bar-fill"
                            style={{ width: '100%' }}
                          />
                        </div>
                        <span
                          className="text-xs font-semibold"
                          style={{
                            color: `var(--progress-${row.status})`,
                            minWidth: 40,
                            textAlign: 'right',
                          }}
                        >
                          {row.category.type === 'income' ? '100%' : '>100%'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted">Sin presupuesto</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="page-container">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Presupuesto</h1>
          <p className="page-subtitle">Planificación base cero mensual</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-secondary" onClick={() => setShowSuggestConfirm(true)} title="Sugerir presupuesto con el promedio de tus últimos 3 meses">
            <Sparkles size={16} /> Auto-sugerir
          </button>
          <button className="btn btn-secondary" onClick={() => setShowCopyConfirm(true)}>
            <Copy size={16} /> Copiar Mes Anterior
          </button>
        </div>
      </div>

      {/* Month Selector. A diferencia del dashboard, aquí SÍ se permite navegar
          al futuro: planificar el presupuesto del próximo mes es un uso real. */}
      <div className="month-selector" style={{ marginBottom: 'var(--space-6)' }}>
        <button className="btn-icon" onClick={() => navigateMonth(-1)} aria-label="Mes anterior">
          <ChevronLeft size={20} />
        </button>
        <span className="month-selector-label">
          {MONTHS_ES[month]} {year}
        </span>
        <button className="btn-icon" onClick={() => navigateMonth(1)} aria-label="Mes siguiente">
          <ChevronRight size={20} />
        </button>
      </div>

      {showSkeleton ? (
        <div role="status" aria-label="Cargando el presupuesto">
          <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', marginBottom: 'var(--space-6)' }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={`sk-kpi-${i}`} className="kpi-card">
                <Skeleton width={120} height={12} style={{ marginBottom: 'var(--space-3)' }} />
                <Skeleton width="70%" height={24} style={{ marginBottom: 'var(--space-3)' }} />
                <Skeleton width="90%" height={11} />
              </div>
            ))}
          </div>
          <SkeletonTable rows={5} />
        </div>
      ) : (
       <>
      {/* Zero-Based Budget Summary Cards */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', marginBottom: 'var(--space-6)' }}>

        {/* Card 0: Puedes gastar */}
        <div className="kpi-card" style={{
          '--kpi-accent':
            summary.estado === 'danger' ? 'var(--color-danger)'
            : summary.estado === 'warning' ? 'var(--color-warning)'
            : summary.estado === 'good' ? 'var(--color-success)'
            : 'var(--text-tertiary)'
        }}>
          <div className="kpi-label">
            Puedes gastar
            <InfoTooltip text="Ingresos reales recibidos − (gastos fijos + ahorro + sobres + pago de deuda planificados) − gastos variables ya gastados. Es lo que te queda para gastar este mes sin atrasar pagos ni metas." />
          </div>
          <div className="kpi-value" style={{
            fontSize: 'clamp(0.95rem, 1.7vw, 1.25rem)',
            color:
              summary.estado === 'danger' ? 'var(--color-danger)'
              : summary.estado === 'warning' ? 'var(--color-warning)'
              : summary.estado === 'good' ? 'var(--color-success)'
              : 'var(--text-primary)'
          }}>
            {formatCurrency(summary.puedesGastar)}
          </div>
          <div className="text-xs text-muted mt-2 font-semibold">
            {summary.estado === 'neutral'
              ? 'Aún no has registrado ingresos este mes'
              : 'Disponible este mes sin atrasar pagos ni metas'}
          </div>
        </div>

        {/* Card 1: Ingresos */}
        <div className="kpi-card" style={{ '--kpi-accent': 'var(--color-income)' }}>
          <div className="kpi-label">
            Ingresos Reales
            <InfoTooltip text="Suma de todas las transacciones de ingreso registradas este mes. 'Planificado' es la suma de los montos estimados de tus categorías de ingreso." />
          </div>
          <div className="kpi-value" style={{ fontSize: 'clamp(0.95rem, 1.7vw, 1.25rem)' }}>
            {formatCurrency(totalIncomeActual)}
          </div>
          <div className="text-xs text-muted mt-2 font-semibold">
            Planificado: <span style={{ color: 'var(--text-primary)' }}>{formatCurrency(totalIncomeEstimated)}</span>
          </div>
        </div>

        {/* Card 2: Total Asignado */}
        <div className="kpi-card" style={{ '--kpi-accent': 'var(--color-fixed)' }}>
          <div className="kpi-label">
            Presupuesto
            <InfoTooltip text="Suma de los montos estimados de tus categorías de gastos (fijos y variables) y de ahorro. 'Uso Real' es lo que llevas gastado en ellas este mes." />
          </div>
          <div className="kpi-value" style={{ fontSize: 'clamp(0.95rem, 1.7vw, 1.25rem)' }}>
            {formatCurrency(totalExpenseEstimated + totalSavingsEstimated)}
          </div>
          <div className="text-xs text-muted mt-2 font-semibold">
            Uso Real: <span style={{ color: 'var(--text-primary)' }}>{formatCurrency(totalExpenseActual + totalSavingsActual)}</span>
          </div>
        </div>

        {/* Card 3: Por Asignar (Zero-based rule) */}
        <div className="kpi-card" id="tour-budget-unassigned" style={{ 
          '--kpi-accent': balanceEstimated === 0 ? 'var(--color-success)' : balanceEstimated > 0 ? 'var(--color-warning)' : 'var(--color-danger)'
        }}>
          <div className="kpi-label">
            Por Asignar
            <InfoTooltip text="Ingreso planificado − todo lo presupuestado (gastos fijos + variables + ahorro + sobres + pago de deuda). En el método base cero debe llegar a 0: a cada peso se le asigna un destino." />
          </div>
          <div className="kpi-value" style={{ 
            fontSize: 'clamp(0.95rem, 1.7vw, 1.25rem)',
            color: balanceEstimated === 0 ? 'var(--color-success)' : balanceEstimated > 0 ? 'var(--color-warning)' : 'var(--color-danger)'
          }}>
            {formatCurrency(balanceEstimated)}
          </div>
          <div className="text-xs mt-2 font-semibold" style={{ color: balanceEstimated === 0 ? 'var(--color-success)' : 'var(--text-secondary)'}}>
            {balanceEstimated === 0 ? '¡Presupuesto perfecto! 🎉' : balanceEstimated > 0 ? 'Falta asignar este dinero' : 'Estás sobregirado'}
          </div>
        </div>

        {/* Card 4: Balance Real */}
        <div className="kpi-card" style={{ 
          '--kpi-accent': balanceActual >= 0 ? 'var(--color-info)' : 'var(--color-danger)'
        }}>
          <div className="kpi-label">
            Efectivo Disponible
            <InfoTooltip text="Ingresos reales − gastos reales − ahorro real de este mes. Es el dinero que realmente sobró (o faltó) según lo ya ocurrido, no lo planificado." />
          </div>
          <div className="kpi-value" style={{ 
            fontSize: 'clamp(0.95rem, 1.7vw, 1.25rem)'
          }}>
            {formatCurrency(balanceActual)}
          </div>
          <div className="text-xs text-muted mt-2 font-semibold">
            Dinero sobrante este mes
          </div>
        </div>
      </div>


      {renderSection('Ingresos', <TrendingUp size={18} style={{ color: 'var(--color-income)' }} />, incomeRows)}
      {renderSection('Gastos Fijos', <Wallet size={18} style={{ color: 'var(--color-fixed)' }} />, budgetRows.filter(r => r.category.type === 'fixed_expense'))}
      {renderSection('Gastos Variables', <TrendingDown size={18} style={{ color: 'var(--color-variable)' }} />, budgetRows.filter(r => r.category.type === 'variable_expense'))}
      {renderSection('Ahorro', <TrendingUp size={18} style={{ color: 'var(--color-savings)' }} />, savingsRows)}

      {(debtPlanned > 0 || debtPaid > 0) && (
        <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
          <div className="card-header">
            <h3 className="card-title flex items-center gap-2">
              <TrendingDown size={18} style={{ color: 'var(--color-danger)' }} /> Pago de Deuda
            </h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Concepto</th>
                  <th style={{ textAlign: 'right', width: 150, whiteSpace: 'nowrap' }}>Planificado</th>
                  <th style={{ textAlign: 'right', width: 150, whiteSpace: 'nowrap' }}>Pagado</th>
                  <th style={{ textAlign: 'right', width: 160, whiteSpace: 'nowrap' }}>Diferencia</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><span className="font-semibold">Pagos del mes (deudas activas)</span></td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{formatCurrency(debtPlanned)}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }} className={debtPaid > 0 ? 'font-semibold' : 'text-muted'}>
                    {formatCurrency(debtPaid)}
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }} className={debtPlanned - debtPaid > 0 ? 'amount-negative' : 'text-muted'}>
                    {formatCurrency(debtPlanned - debtPaid)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
       </>
      )}

      <Modal
        isOpen={!!configCat}
        onClose={() => setConfigCat(null)}
        title={`Sobre acumulativo — ${configCat?.name || ''}`}
      >
        <div className="form-group">
          <label className="flex items-center gap-2" style={{ cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={configForm.isAccumulative}
              onChange={(e) => setConfigForm({ ...configForm, isAccumulative: e.target.checked })}
              style={{ width: 'auto' }}
            />
            <span className="form-label" style={{ marginBottom: 0 }}>
              Tratar como sobre acumulativo (arrastra el saldo no gastado mes a mes)
            </span>
          </label>
        </div>
        {configForm.isAccumulative && (
          <div className="form-group">
            <label className="form-label">Mes de inicio del bote</label>
            <input
              type="month"
              value={configForm.accumulationStart}
              onChange={(e) => setConfigForm({ ...configForm, accumulationStart: e.target.value })}
            />
          </div>
        )}
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={() => setConfigCat(null)}>Cancelar</button>
          <button type="button" className="btn btn-primary" onClick={handleSaveConfig}>Guardar</button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={showSuggestConfirm}
        onClose={() => setShowSuggestConfirm(false)}
        onConfirm={handleAutoSuggest}
        title="Auto-sugerir presupuesto"
        message={`Se asignará a cada categoría el promedio de lo registrado en los últimos 3 meses. Esto reemplazará los montos estimados que ya tengas en ${MONTHS_ES[month]} ${year}. ¿Continuar?`}
        confirmText="Sí, sugerir"
        danger={false}
      />

      <ConfirmDialog
        isOpen={showCopyConfirm}
        onClose={() => setShowCopyConfirm(false)}
        onConfirm={handleCopyPrevious}
        title="Copiar mes anterior"
        message={`Se copiarán los montos estimados del mes anterior a ${MONTHS_ES[month]} ${year}, reemplazando los que ya tengas asignados. ¿Continuar?`}
        confirmText="Sí, copiar"
        danger={false}
      />

    </div>
  );
}
