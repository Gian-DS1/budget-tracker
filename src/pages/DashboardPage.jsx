// FinTrack RD — Dashboard Page

import { useMemo, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  CreditCard,
  Calendar as CalendarIcon,
  ArrowRightLeft,
  Scale,
  PiggyBank,
  Landmark,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import useTransactionStore from '../stores/useTransactionStore';
import useSavingsStore from '../stores/useSavingsStore';
import useDebtStore from '../stores/useDebtStore';
import useCategoryStore from '../stores/useCategoryStore';
import useBudgetStore from '../stores/useBudgetStore';

import useCreditCardStore from '../stores/useCreditCardStore';
import {
  formatCurrency,
  formatPercent,
  formatDate,
} from '../utils/formatters';
import { MONTHS_SHORT_ES, MONTHS_ES } from '../utils/constants';
import { getBudgetSummary } from '../utils/calculations';
import { getCardBalances } from '../utils/creditCards';
import useRateStore from '../stores/useRateStore';
import Modal from '../components/ui/Modal';
import { SkeletonDashboard } from '../components/ui/Skeleton';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="card-glass" style={{ padding: 'var(--space-3)', minWidth: 150 }}>
        <p className="font-semibold mb-2">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex justify-between items-center text-sm mb-1">
            <span style={{ color: entry.color, marginRight: 'var(--space-4)' }}>
              {entry.name}:
            </span>
            <span className="font-bold">{formatCurrency(entry.value)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const { transactions } = useTransactionStore();
  const { categories } = useCategoryStore();
  const { getTotalSaved } = useSavingsStore();
  const { getTotalDebt } = useDebtStore();
  const budgets = useBudgetStore((s) => s.budgets);
  const debts = useDebtStore((s) => s.debts);
  const payments = useDebtStore((s) => s.payments);
  const getTotalMonthlyPayment = useDebtStore((s) => s.getTotalMonthlyPayment);

  const cards = useCreditCardStore((s) => s.cards);
  const fxRate = useRateStore((s) => s.getRate());
  const txLoading = useTransactionStore((s) => s.loading);
  // Esqueleto solo en carga en frío (cargando y sin transacciones en caché).
  const showSkeleton = txLoading && transactions.length === 0;

  const [selectedDay, setSelectedDay] = useState(null);

  const selectedDayTransactions = useMemo(() => {
    if (!selectedDay) return [];
    return transactions
      .filter((t) => t.date === selectedDay)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [selectedDay, transactions]);

  // El mes que se está viendo. Arranca en el mes actual; el selector permite
  // mirar meses anteriores. (Los nombres currentMonth/currentYear se conservan
  // porque alimentan todos los cálculos de abajo.)
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const [currentMonth, setCurrentMonth] = useState(thisMonth);
  const [currentYear, setCurrentYear] = useState(thisYear);

  // No tiene sentido navegar al futuro: un dashboard de gastos no tiene datos
  // por delante. Se topa en el mes actual.
  const isCurrentMonth = currentMonth === thisMonth && currentYear === thisYear;

  const navigateMonth = (direction) => {
    if (direction > 0 && isCurrentMonth) return;
    let newMonth = currentMonth + direction;
    let newYear = currentYear;
    if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    } else if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    }
    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
  };

  // ─── KPIs Calculation ─────────────────────────────────────────

  const currentMonthTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const d = new Date(t.date + 'T00:00:00');
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });
  }, [transactions, currentMonth, currentYear]);

  const monthBudgets = useMemo(
    () => budgets.filter((b) => b.year === currentYear && b.month === currentMonth),
    [budgets, currentYear, currentMonth]
  );

  const debtPaidThisMonth = useMemo(() => {
    return payments.reduce((sum, p) => {
      const d = new Date(p.date + 'T00:00:00');
      if (d.getFullYear() !== currentYear || d.getMonth() !== currentMonth) return sum;
      const debt = debts.find((dd) => dd.id === p.debtId);
      const val = Number(p.amount) || 0;
      return sum + (debt && debt.currency === 'USD' ? val * fxRate : val);
    }, 0);
  }, [payments, debts, currentYear, currentMonth, fxRate]);

  const summary = useMemo(
    () =>
      getBudgetSummary({
        monthTransactions: currentMonthTransactions,
        monthBudgets,
        categories,
        debtPlanned: getTotalMonthlyPayment(),
        debtPaid: debtPaidThisMonth,
      }),
    [currentMonthTransactions, monthBudgets, categories, getTotalMonthlyPayment, debtPaidThisMonth]
  );

  const cardAlerts = useMemo(() => {
    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return cards
      .map((card) => {
        const bal = getCardBalances(card, transactions, today);
        const due = new Date(bal.cycles.dueDateISO + 'T00:00:00');
        const days = Math.round((due - todayMidnight) / 86400000);
        return { card, amount: bal.pendingBilled, dueISO: bal.cycles.dueDateISO, days, paid: bal.isPaid };
      })
      .filter((a) => !a.paid && a.amount > 0 && a.days >= 0 && a.days <= 5);
  }, [cards, transactions]);

  const previousMonthTransactions = useMemo(() => {
    let prevMonth = currentMonth - 1;
    let prevYear = currentYear;
    if (prevMonth < 0) {
      prevMonth = 11;
      prevYear--;
    }
    return transactions.filter((t) => {
      const d = new Date(t.date + 'T00:00:00');
      return d.getFullYear() === prevYear && d.getMonth() === prevMonth;
    });
  }, [transactions, currentMonth, currentYear]);

  const calculateTotals = (txs) => {
    let income = 0;
    let expense = 0;
    txs.forEach((t) => {
      if (t.type === 'income') income += Number(t.amount);
      if (t.type === 'expense' || t.type === 'fixed_expense' || t.type === 'variable_expense') {
        // Gasto efectivo: neto del cashback generado por la transacción.
        expense += Number(t.amount) - Number(t.cashbackEarned || 0);
      }
    });
    return { income, expense, balance: income - expense };
  };

  const currentTotals = calculateTotals(currentMonthTransactions);
  const previousTotals = calculateTotals(previousMonthTransactions);

  // Sin mes anterior con datos no hay comparación honesta: devolvemos null y
  // ocultamos el delta, en vez de inventar un "+100%" contra cero.
  const getPercentChange = (current, previous) => {
    if (previous === 0) return null;
    return ((current - previous) / previous) * 100;
  };

  const incomeChange = getPercentChange(currentTotals.income, previousTotals.income);
  const expenseChange = getPercentChange(currentTotals.expense, previousTotals.expense);

  const savingsRate = currentTotals.income > 0
    ? ((currentTotals.income - currentTotals.expense) / currentTotals.income) * 100
    : 0;

  // ─── Patrimonio (balances lentos, fuera del flujo del mes) ──────
  const totalSaved = getTotalSaved();
  const totalDebt = getTotalDebt();
  const netWorth = totalSaved - totalDebt;

  // Signo explícito para los deltas: el color nunca viaja solo (daltonismo).
  const signedPct = (v) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1)}%`;

  // ─── Bar Chart: 6 Months Trend ──────────────────────────────

  const trendData = useMemo(() => {
    const data = [];
    for (let i = 5; i >= 0; i--) {
      let m = currentMonth - i;
      let y = currentYear;
      if (m < 0) {
        m += 12;
        y--;
      }
      
      const monthTxs = transactions.filter((t) => {
        const d = new Date(t.date + 'T00:00:00');
        return d.getFullYear() === y && d.getMonth() === m;
      });

      const { income, expense } = calculateTotals(monthTxs);
      
      data.push({
        name: MONTHS_SHORT_ES[m],
        Ingresos: income,
        Gastos: expense,
      });
    }
    return data;
  }, [transactions, currentMonth, currentYear]);

  // ─── Donut Chart: Expense by Category ───────────────────────

  const expenseByCategory = useMemo(() => {
    const expenses = currentMonthTransactions.filter(
      (t) => t.type === 'expense' || t.type === 'fixed_expense' || t.type === 'variable_expense'
    );

    const grouped = {};
    expenses.forEach((t) => {
      if (!grouped[t.categoryId]) {
        grouped[t.categoryId] = 0;
      }
      // Gasto efectivo: neto del cashback generado por la transacción.
      grouped[t.categoryId] += Number(t.amount) - Number(t.cashbackEarned || 0);
    });

    const sorted = Object.entries(grouped)
      .map(([categoryId, value]) => {
        const cat = categories.find((c) => c.id === categoryId);
        return {
          name: cat ? cat.name : 'Otros',
          value,
          color: cat ? cat.color : '#8b97a8',
        };
      })
      .sort((a, b) => b.value - a.value);

    // Tope la leyenda en 6 categorías + "Otros": una lista de 15 filas no se
    // lee y obliga a hacer scroll junto al donut.
    const MAX_SLICES = 6;
    if (sorted.length <= MAX_SLICES + 1) return sorted;
    const top = sorted.slice(0, MAX_SLICES);
    const restValue = sorted.slice(MAX_SLICES).reduce((sum, s) => sum + s.value, 0);
    return [...top, { name: 'Otros', value: restValue, color: 'var(--text-tertiary)' }];
  }, [currentMonthTransactions, categories]);

  // ─── Recent Transactions ─────────────────────────────────────

  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);
  }, [transactions]);

  // ─── Mini Calendar Helpers ───────────────────────────────────
  
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const calendarDays = useMemo(() => {
    const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
    const offset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    const days = Array.from({ length: daysInMonth }, (_, i) => {
      const dayStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
      const dayTxs = currentMonthTransactions.filter(t => t.date === dayStr);
      const { income, expense } = calculateTotals(dayTxs);
      
      let color = 'transparent';
      if (income > 0 && expense === 0) color = 'var(--color-income-bg)';
      else if (expense > 0 && income === 0) color = 'var(--color-expense-bg)';
      else if (income > 0 && expense > 0) color = 'var(--bg-tertiary)';

      return { day: i + 1, date: dayStr, color, hasActivity: income > 0 || expense > 0 };
    });
    return { days, offset };
  }, [currentMonthTransactions, daysInMonth, currentMonth, currentYear]);

  return (
    <div className="page-container">
      <div className="page-header flex justify-between items-center">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Resumen financiero de {MONTHS_SHORT_ES[currentMonth]} {currentYear}</p>
        </div>
        <div className="month-selector">
          <button
            className="btn-icon btn-month-nav"
            onClick={() => navigateMonth(-1)}
            aria-label="Mes anterior"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="month-selector-label">
            {MONTHS_ES[currentMonth]} {currentYear}
          </span>
          <button
            className="btn-icon btn-month-nav"
            onClick={() => navigateMonth(1)}
            disabled={isCurrentMonth}
            aria-label="Mes siguiente"
            style={isCurrentMonth ? { opacity: 0.35, cursor: 'not-allowed' } : undefined}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {showSkeleton ? (
        <SkeletonDashboard />
      ) : (
       <>
      {/* Héroe: Puedes gastar */}
      <div className="kpi-card animate-kpi-entrance" id="tour-dashboard-hero" style={{
        marginBottom: 'var(--space-6)',
        '--kpi-accent':
          summary.estado === 'danger' ? 'var(--color-danger)'
          : summary.estado === 'warning' ? 'var(--color-warning)'
          : summary.estado === 'good' ? 'var(--color-success)'
          : 'var(--text-tertiary)'
      }}>
        <div className="kpi-label">
          {isCurrentMonth ? 'Puedes gastar este mes' : `Disponible en ${MONTHS_ES[currentMonth]}`}
        </div>
        <div className="kpi-value" style={{
          fontSize: 'clamp(1.6rem, 4vw, 2.4rem)',
          color:
            summary.estado === 'danger' ? 'var(--color-danger)'
            : summary.estado === 'warning' ? 'var(--color-warning)'
            : summary.estado === 'good' ? 'var(--color-success)'
            : 'var(--text-primary)'
        }}>
          {formatCurrency(summary.puedesGastar)}
        </div>
        <div className="text-sm text-muted mt-2">
          {summary.estado === 'neutral'
            ? (isCurrentMonth
                ? 'Aún no has registrado ingresos este mes.'
                : `No registraste ingresos en ${MONTHS_ES[currentMonth]}.`)
            : 'Disponible sin atrasarte en pagos ni metas.'}
        </div>
        <div className="kpi-icon" style={{ background: 'var(--accent-primary-subtle)', color: 'var(--kpi-accent)' }}>
          <Wallet size={20} />
        </div>
      </div>

      {cardAlerts.map((a) => (
        <div key={a.card.id} className="alert alert-warning animate-alert-entrance" style={{ marginBottom: 'var(--space-4)' }}>
          <CreditCard size={16} />
          <span>
            <strong>{a.card.name}</strong>: pago de {formatCurrency(a.amount)} vence {a.days === 0 ? 'hoy' : `en ${a.days} día${a.days === 1 ? '' : 's'}`} ({formatDate(a.dueISO)}).
          </span>
        </div>
      ))}

      {/* Resumen: el mes (flujo) pesa más que el patrimonio (balances lentos). */}
      <div className="overview-grid" id="tour-dashboard-summary">

        {/* ── Flujo del mes ── */}
        <section className="overview-panel animate-panel-entrance" style={{'--i': 0}} aria-labelledby="ov-flujo">
          <h2 className="overview-panel-head" id="ov-flujo">
            <ArrowRightLeft size={14} /> Flujo del mes
          </h2>

          <div className="flow-pair">
            <div>
              <div className="flow-stat-label">
                <TrendingUp size={14} style={{ color: 'var(--color-income)' }} /> Ingresos
              </div>
              <div className="flow-stat-value" style={{ color: 'var(--color-income)' }}>
                +{formatCurrency(currentTotals.income)}
              </div>
              {incomeChange !== null ? (
                <div className={`flow-stat-delta ${incomeChange >= 0 ? 'is-good' : 'is-bad'}`}>
                  {incomeChange >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                  {signedPct(incomeChange)} vs mes ant.
                </div>
              ) : (
                <div className="flow-stat-note">Sin mes anterior para comparar</div>
              )}
            </div>

            <div className="flow-divider" aria-hidden="true" />

            <div>
              <div className="flow-stat-label">
                <TrendingDown size={14} style={{ color: 'var(--color-expense)' }} /> Gastos
              </div>
              <div className="flow-stat-value" style={{ color: 'var(--color-expense)' }}>
                −{formatCurrency(currentTotals.expense)}
              </div>
              {/* En gastos, bajar es bueno: el color sigue al sentido, no al signo. */}
              {expenseChange !== null ? (
                <div className={`flow-stat-delta ${expenseChange <= 0 ? 'is-good' : 'is-bad'}`}>
                  {expenseChange <= 0 ? <TrendingDown size={11} /> : <TrendingUp size={11} />}
                  {signedPct(expenseChange)} vs mes ant.
                </div>
              ) : (
                <div className="flow-stat-note">Sin mes anterior para comparar</div>
              )}
            </div>
          </div>

          <div className="flow-result">
            <div>
              <div className="flow-result-label">Balance neto</div>
              <div className="flow-result-sub">Tasa de ahorro {savingsRate.toFixed(1)}%</div>
            </div>
            <div
              className="flow-result-value"
              style={{ color: currentTotals.balance >= 0 ? 'var(--color-income)' : 'var(--color-expense)' }}
            >
              {currentTotals.balance >= 0 ? '+' : '−'}{formatCurrency(Math.abs(currentTotals.balance))}
            </div>
          </div>
        </section>

        {/* ── Patrimonio (más callado) ── */}
        <section className="overview-panel animate-panel-entrance" style={{'--i': 1}} aria-labelledby="ov-patrimonio">
          <h2 className="overview-panel-head" id="ov-patrimonio">
            <Scale size={14} /> Patrimonio
          </h2>

          <div className="networth-lead">
            <div className="flow-result-label" style={{ marginBottom: 'var(--space-1)' }}>
              Patrimonio neto
            </div>
            <div
              className="networth-lead-value"
              style={{ color: netWorth >= 0 ? 'var(--text-primary)' : 'var(--color-expense)' }}
            >
              {netWorth < 0 ? '−' : ''}{formatCurrency(Math.abs(netWorth))}
            </div>
          </div>

          <div className="networth-rows">
            <div className="networth-row">
              <div className="networth-row-label">
                <span className="networth-row-dot" style={{ background: 'var(--color-savings)' }} />
                <PiggyBank size={15} style={{ color: 'var(--text-tertiary)' }} /> Ahorros
              </div>
              <div className="networth-row-value" style={{ color: 'var(--color-savings)' }}>
                {formatCurrency(totalSaved)}
              </div>
            </div>
            <div className="networth-row">
              <div className="networth-row-label">
                <span className="networth-row-dot" style={{ background: 'var(--color-debt)' }} />
                <Landmark size={15} style={{ color: 'var(--text-tertiary)' }} /> Deuda total
              </div>
              <div className="networth-row-value" style={{ color: totalDebt > 0 ? 'var(--color-debt)' : 'var(--text-secondary)' }}>
                {totalDebt > 0 ? '−' : ''}{formatCurrency(totalDebt)}
              </div>
            </div>
          </div>
        </section>
      </div>


      <div className="grid-2">
        {/* Trend Chart */}
        <div className="chart-container animate-chart-entrance" style={{'--i': 0}}>
          <div className="chart-header">
            <h3 className="chart-title">Evolución (6 meses)</h3>
          </div>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-secondary)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }} tickFormatter={(val) => `$${val/1000}k`} />
                <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg-card-hover)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 20 }} />
                <Bar dataKey="Ingresos" fill="var(--color-income)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="Gastos" fill="var(--color-expense)" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Chart */}
        <div className="chart-container animate-chart-entrance" style={{'--i': 1}}>
          <div className="chart-header">
            <h3 className="chart-title">Distribución de Gastos</h3>
          </div>
          <div className="donut-row">
            {expenseByCategory.length > 0 ? (
              <div className="donut-canvas">
                <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius="58%"
                    outerRadius="88%"
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {expenseByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              </div>
            ) : (
              <div className="w-full text-center text-muted">
                No hay gastos registrados este mes
              </div>
            )}
            
            {/* Legend inside the container for better layout */}
            {expenseByCategory.length > 0 && (
              <div className="donut-legend">
                {expenseByCategory.map((entry, idx) => (
                  <div key={idx} className="flex items-start justify-between mb-3 text-xs">
                    <div className="flex items-start gap-2" style={{ flex: 1, minWidth: 0, paddingRight: '10px' }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: entry.color, flexShrink: 0, marginTop: '4px' }} />
                      <span style={{ wordBreak: 'break-word' }} title={entry.name}>{entry.name}</span>
                    </div>
                    <span className="font-semibold" style={{ flexShrink: 0 }}>{formatPercent((entry.value / currentTotals.expense) * 100)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ marginTop: 'var(--space-6)' }}>
        {/* Recent Transactions */}
        <div className="card animate-chart-entrance">
          <div className="card-header">
            <h3 className="card-title">Transacciones Recientes</h3>
          </div>
          {recentTransactions.length > 0 ? (
            <div className="flex flex-col gap-4">
              {recentTransactions.map((t, idx) => {
                const cat = categories.find(c => c.id === t.categoryId);
                return (
                  <div key={t.id} className="flex items-center justify-between gap-3 animate-transaction-entrance" style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', minWidth: 0, padding: 'var(--space-3) var(--space-6)', '--i': idx }}>
                    <div className="flex items-center gap-3" style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: '1.5rem', background: 'var(--bg-card)', padding: '8px', borderRadius: 'var(--radius-md)', flexShrink: 0 }}>
                        {cat?.icon || '💸'}
                      </div>
                      <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
                        <div className="font-semibold" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={t.description || 'Sin descripción'}>
                          {t.description || 'Sin descripción'}
                        </div>
                        <div className="text-xs text-muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {formatDate(t.date)} • {cat?.name || 'Sin categoría'}
                        </div>
                      </div>
                    </div>
                    <div className={`font-bold ${t.type === 'income' ? 'amount-positive' : 'amount-negative'}`} style={{ flexShrink: 0, whiteSpace: 'nowrap', textAlign: 'right' }}>
                      {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center text-muted py-8">No hay transacciones recientes</div>
          )}
        </div>

        {/* Mini Calendar */}
        <div className="card" id="tour-dashboard-calendar">
          <div className="card-header">
            <h3 className="card-title flex items-center gap-2">
              <CalendarIcon size={18} /> Actividad del Mes
            </h3>
          </div>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(7, 1fr)', 
            gap: 'var(--space-2)',
            textAlign: 'center' 
          }}>
            {/* Days header (lun-dom; X para miércoles evita la doble M ambigua) */}
            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d, i) => (
              <div key={`wd-${i}`} className="text-xs font-bold text-muted mb-2">{d}</div>
            ))}
            
            {Array.from({ length: calendarDays.offset }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {/* Days */}
            {calendarDays.days.map((day) => (
              <div
                key={day.day}
                className={`tooltip-container flex items-center justify-center day-cell-selected ${selectedDay === day.date ? 'is-selected' : ''}`}
                role={day.hasActivity ? 'button' : undefined}
                tabIndex={day.hasActivity ? 0 : undefined}
                aria-label={day.hasActivity ? `Ver transacciones del ${formatDate(day.date)}` : undefined}
                aria-pressed={selectedDay === day.date}
                onClick={() => day.hasActivity && setSelectedDay(day.date)}
                onKeyDown={(e) => {
                  if (day.hasActivity && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    setSelectedDay(day.date);
                  }
                }}
                style={{
                  aspectRatio: '1',
                  borderRadius: 'var(--radius-sm)',
                  background: selectedDay === day.date ? 'var(--accent-primary)' : day.color,
                  border: selectedDay === day.date ? 'none' : (day.hasActivity ? 'none' : '1px solid var(--border-primary)'),
                  fontSize: 'var(--font-xs)',
                  fontWeight: day.hasActivity ? 'bold' : 'normal',
                  color: selectedDay === day.date ? 'white' : (day.hasActivity ? 'var(--text-primary)' : 'var(--text-tertiary)'),
                  cursor: day.hasActivity ? 'pointer' : 'default'
                }}
              >
                {day.day}
                {day.hasActivity && (
                  <span className="tooltip">Ver transacciones del día</span>
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-4 mt-6 text-xs text-muted">
            <div className="flex items-center gap-1"><div style={{width: 10, height: 10, borderRadius: 2, background: 'var(--color-income-bg)'}}/> Ingresos</div>
            <div className="flex items-center gap-1"><div style={{width: 10, height: 10, borderRadius: 2, background: 'var(--color-expense-bg)'}}/> Gastos</div>
            <div className="flex items-center gap-1"><div style={{width: 10, height: 10, borderRadius: 2, background: 'var(--bg-tertiary)'}}/> Ambos</div>
          </div>
        </div>
      </div>
       </>
      )}

      {/* Detalle del día (al hacer clic en el calendario) */}
      <Modal
        isOpen={!!selectedDay}
        onClose={() => setSelectedDay(null)}
        title={selectedDay ? `Transacciones del ${formatDate(selectedDay)}` : 'Transacciones'}
      >
        {selectedDayTransactions.length > 0 ? (
          <div className="flex flex-col gap-3">
            {selectedDayTransactions.map((t) => {
              const cat = categories.find((c) => c.id === t.categoryId);
              return (
                <div key={t.id} className="flex items-center justify-between gap-3" style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)', minWidth: 0 }}>
                  <div className="flex items-center gap-3" style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '1.3rem', background: 'var(--bg-card)', padding: '6px', borderRadius: 'var(--radius-sm)', flexShrink: 0, lineHeight: 1 }}>
                      {cat?.icon || '💸'}
                    </div>
                    <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
                      <div className="font-semibold" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.description || 'Sin descripción'}
                      </div>
                      <div className="text-xs text-muted">{cat?.name || 'Sin categoría'}</div>
                    </div>
                  </div>
                  <div className={`font-bold ${t.type === 'income' ? 'amount-positive' : 'amount-negative'}`} style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
                    {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center text-muted p-8">No hay transacciones registradas este día.</div>
        )}
      </Modal>

    </div>
  );
}
