// FinTrack RD — Budget Page

import { useState, useMemo, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  AlertTriangle,
  Wallet,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import useBudgetStore from '../stores/useBudgetStore';
import useTransactionStore from '../stores/useTransactionStore';
import useCategoryStore from '../stores/useCategoryStore';
import CurrencyInput from '../components/ui/CurrencyInput';
import { formatCurrency, formatPercent } from '../utils/formatters';
import { calculateBudgetProgress, sumAmounts } from '../utils/calculations';
import { MONTHS_ES } from '../utils/constants';
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

export default function BudgetPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const budgets = useBudgetStore((state) => state.budgets);
  const { setBudget, copyBudgetFromPreviousMonth } = useBudgetStore();
  const { transactions } = useTransactionStore();
  const { categories } = useCategoryStore();

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

      return {
        category: cat,
        estimated,
        actual,
        progress,
        budgetId: budget?.id,
      };
    });
  }, [categories, monthBudgets, monthTransactions]);

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

  const balanceEstimated = totalIncomeEstimated - totalExpenseEstimated - totalSavingsEstimated;
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

  const handleCopyPrevious = () => {
    const success = copyBudgetFromPreviousMonth(year, month);
    if (success) {
      toast.success('Presupuesto copiado del mes anterior');
    } else {
      toast.error('No hay presupuesto en el mes anterior');
    }
  };

  const handleEstimatedChange = useCallback((categoryId, value) => {
    const amount = parseFloat(value) || 0;
    setBudget(categoryId, year, month, amount);
  }, [setBudget, year, month]);

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
                <th style={{ textAlign: 'right', width: 150 }}>Estimado</th>
                <th style={{ textAlign: 'right', width: 150 }}>Actual</th>
                <th style={{ textAlign: 'right', width: 120 }}>Diferencia</th>
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
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <BudgetEstimatedInput
                      key={`${row.category.id}-${year}-${month}`}
                      initialValue={row.estimated}
                      onSave={(value) => handleEstimatedChange(row.category.id, value)}
                    />
                  </td>
                  <td
                    style={{ textAlign: 'right' }}
                    className={row.actual > 0 ? 'font-semibold' : 'text-muted'}
                  >
                    {formatCurrency(row.actual)}
                  </td>
                  <td
                    style={{ textAlign: 'right' }}
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
                    {row.estimated > 0 ? (
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

  // Alerts for categories over 90%
  const overBudgetAlerts = budgetRows.filter(
    (r) => r.estimated > 0 && r.progress >= 90 && r.category.type !== 'income'
  );

  return (
    <div className="page-container">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Presupuesto</h1>
          <p className="page-subtitle">Planificación base cero mensual</p>
        </div>
        <button className="btn btn-secondary" onClick={handleCopyPrevious}>
          <Copy size={16} /> Copiar Mes Anterior
        </button>
      </div>

      {/* Month Selector */}
      <div className="month-selector" style={{ marginBottom: 'var(--space-6)' }}>
        <button className="btn-icon" onClick={() => navigateMonth(-1)}>
          <ChevronLeft size={20} />
        </button>
        <span className="month-selector-label">
          {MONTHS_ES[month]} {year}
        </span>
        <button className="btn-icon" onClick={() => navigateMonth(1)}>
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Alerts */}
      {overBudgetAlerts.map((alert) => (
        <div key={alert.category.id} className={`alert ${alert.progress >= 100 ? 'alert-danger' : 'alert-warning'}`}>
          <AlertTriangle size={16} />
          <span>
            <strong>{alert.category.icon} {alert.category.name}</strong>: {formatPercent(alert.progress, 0)} del presupuesto utilizado
            ({formatCurrency(alert.actual)} de {formatCurrency(alert.estimated)})
          </span>
        </div>
      ))}

      {/* Comparison Header Cards */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 'var(--space-6)' }}>
        <div className="kpi-card" style={{ '--kpi-accent': 'var(--accent-secondary)' }}>
          <div className="kpi-label">Gastos Presupuestados</div>
          <div className="kpi-value" style={{ fontSize: 'var(--font-xl)' }}>
            {formatCurrency(totalExpenseEstimated)}
          </div>
          <div className="text-xs text-muted mt-2">
            Límite planificado para el mes
          </div>
        </div>
        <div className="kpi-card" style={{ '--kpi-accent': 'var(--color-expense)' }}>
          <div className="kpi-label">Gastos Reales</div>
          <div className="kpi-value" style={{ fontSize: 'var(--font-xl)', color: 'var(--color-expense)' }}>
            {formatCurrency(totalExpenseActual)}
          </div>
          <div className="text-xs text-muted mt-2">
            Dinero realmente gastado
          </div>
        </div>
        <div className="kpi-card" style={{ '--kpi-accent': totalExpenseEstimated - totalExpenseActual >= 0 ? 'var(--color-income)' : 'var(--color-danger)' }}>
          <div className="kpi-label">Diferencia de Gastos</div>
          <div className="kpi-value" style={{ fontSize: 'var(--font-xl)', color: totalExpenseEstimated - totalExpenseActual >= 0 ? 'var(--color-income)' : 'var(--color-danger)' }}>
            {formatCurrency(totalExpenseEstimated - totalExpenseActual)}
          </div>
          <div className="text-xs text-muted mt-2">
            {totalExpenseEstimated - totalExpenseActual >= 0 ? 'Ahorro sobre presupuesto' : 'Exceso de presupuesto'}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="kpi-card" style={{ '--kpi-accent': 'var(--color-income)' }}>
          <div className="kpi-label">Ingresos</div>
          <div className="kpi-value" style={{ fontSize: 'var(--font-xl)' }}>
            {formatCurrency(totalIncomeActual)}
          </div>
          <div className="text-xs text-muted mt-2">
            Estimado: {formatCurrency(totalIncomeEstimated)}
          </div>
        </div>
        <div className="kpi-card" style={{ '--kpi-accent': 'var(--color-expense)' }}>
          <div className="kpi-label">Gastos</div>
          <div className="kpi-value" style={{ fontSize: 'var(--font-xl)' }}>
            {formatCurrency(totalExpenseActual)}
          </div>
          <div className="text-xs text-muted mt-2">
            Estimado: {formatCurrency(totalExpenseEstimated)}
          </div>
        </div>
        <div className="kpi-card" style={{ '--kpi-accent': 'var(--color-savings)' }}>
          <div className="kpi-label">Ahorro</div>
          <div className="kpi-value" style={{ fontSize: 'var(--font-xl)' }}>
            {formatCurrency(totalSavingsActual)}
          </div>
          <div className="text-xs text-muted mt-2">
            Estimado: {formatCurrency(totalSavingsEstimated)}
          </div>
        </div>
        <div
          className="kpi-card"
          style={{
            '--kpi-accent':
              balanceActual >= 0 ? 'var(--color-income)' : 'var(--color-expense)',
          }}
        >
          <div className="kpi-label">Balance</div>
          <div
            className="kpi-value"
            style={{
              fontSize: 'var(--font-xl)',
              color: balanceActual >= 0 ? 'var(--color-income)' : 'var(--color-expense)',
            }}
          >
            {formatCurrency(balanceActual)}
          </div>
          <div className="text-xs text-muted mt-2">
            Estimado: {formatCurrency(balanceEstimated)}
          </div>
        </div>
      </div>

      {/* Budget Tables by Section */}
      {renderSection('Ingresos', <TrendingUp size={18} style={{ color: 'var(--color-income)' }} />, incomeRows)}
      {renderSection('Gastos Fijos', <Wallet size={18} style={{ color: 'var(--color-fixed)' }} />, budgetRows.filter(r => r.category.type === 'fixed_expense'))}
      {renderSection('Gastos Variables', <TrendingDown size={18} style={{ color: 'var(--color-variable)' }} />, budgetRows.filter(r => r.category.type === 'variable_expense'))}
      {renderSection('Ahorro', <TrendingUp size={18} style={{ color: 'var(--color-savings)' }} />, savingsRows)}
    </div>
  );
}
