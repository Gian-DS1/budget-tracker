// FinTrack RD — Dashboard Page

import { useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Target,
  CreditCard,
  Calendar as CalendarIcon,
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
import {
  formatCurrency,
  formatPercent,
  formatDate,
  MONTHS_SHORT_ES,
} from '../utils/formatters';

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


  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // ─── KPIs Calculation ─────────────────────────────────────────

  const currentMonthTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const d = new Date(t.date + 'T00:00:00');
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });
  }, [transactions, currentMonth, currentYear]);

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
        expense += Number(t.amount);
      }
    });
    return { income, expense, balance: income - expense };
  };

  const currentTotals = calculateTotals(currentMonthTransactions);
  const previousTotals = calculateTotals(previousMonthTransactions);

  const getPercentChange = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const incomeChange = getPercentChange(currentTotals.income, previousTotals.income);
  const expenseChange = getPercentChange(currentTotals.expense, previousTotals.expense);

  const savingsRate = currentTotals.income > 0 
    ? ((currentTotals.income - currentTotals.expense) / currentTotals.income) * 100 
    : 0;

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
      grouped[t.categoryId] += Number(t.amount);
    });

    return Object.entries(grouped)
      .map(([categoryId, value]) => {
        const cat = categories.find((c) => c.id === categoryId);
        return {
          name: cat ? cat.name : 'Otros',
          value,
          color: cat ? cat.color : '#94a3b8',
        };
      })
      .sort((a, b) => b.value - a.value); // Sort desc
  }, [currentMonthTransactions, categories]);

  // ─── Recent Transactions ─────────────────────────────────────

  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);
  }, [transactions]);

  // ─── Mini Calendar Helpers ───────────────────────────────────
  
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => {
    const dayStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
    const dayTxs = currentMonthTransactions.filter(t => t.date === dayStr);
    const { income, expense } = calculateTotals(dayTxs);
    
    let color = 'transparent';
    if (income > 0 && expense === 0) color = 'var(--color-income-bg)';
    else if (expense > 0 && income === 0) color = 'var(--color-expense-bg)';
    else if (income > 0 && expense > 0) color = 'var(--bg-tertiary)';

    return { day: i + 1, date: dayStr, color, hasActivity: income > 0 || expense > 0 };
  });


  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Resumen financiero de {MONTHS_SHORT_ES[currentMonth]} {currentYear}</p>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid" id="tour-dashboard-summary">
        <div className="kpi-card" style={{ '--kpi-accent': 'var(--color-income)' }}>
          <div className="kpi-label">Ingresos del Mes</div>
          <div className="kpi-value">{formatCurrency(currentTotals.income)}</div>
          <div className={`kpi-change ${incomeChange >= 0 ? 'positive' : 'negative'}`}>
            {incomeChange >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(incomeChange).toFixed(1)}% vs mes ant.
          </div>
          <div className="kpi-icon" style={{ background: 'var(--color-income-bg)', color: 'var(--color-income)' }}>
            <TrendingUp size={20} />
          </div>
        </div>

        <div className="kpi-card" style={{ '--kpi-accent': 'var(--color-expense)' }}>
          <div className="kpi-label">Gastos del Mes</div>
          <div className="kpi-value">{formatCurrency(currentTotals.expense)}</div>
          <div className={`kpi-change ${expenseChange <= 0 ? 'positive' : 'negative'}`}>
            {expenseChange <= 0 ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
            {Math.abs(expenseChange).toFixed(1)}% vs mes ant.
          </div>
          <div className="kpi-icon" style={{ background: 'var(--color-expense-bg)', color: 'var(--color-expense)' }}>
            <Wallet size={20} />
          </div>
        </div>

        <div className="kpi-card" style={{ '--kpi-accent': 'var(--color-info)' }}>
          <div className="kpi-label">Balance Neto</div>
          <div className="kpi-value">{formatCurrency(currentTotals.balance)}</div>
          <div className="kpi-change" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--color-info)' }}>
            Tasa de ahorro: {savingsRate.toFixed(1)}%
          </div>
          <div className="kpi-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--color-info)' }}>
            <Target size={20} />
          </div>
        </div>

        <div className="kpi-card" style={{ '--kpi-accent': 'var(--color-warning)' }}>
          <div className="kpi-label">Deuda Total</div>
          <div className="kpi-value">{formatCurrency(getTotalDebt())}</div>
          <div className="kpi-change" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-warning)' }}>
            Patrimonio: {formatCurrency(getTotalSaved() - getTotalDebt())}
          </div>
          <div className="kpi-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-warning)' }}>
            <CreditCard size={20} />
          </div>
        </div>
      </div>

      <div className="grid-2">
        {/* Trend Chart */}
        <div className="chart-container">
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
        <div className="chart-container">
          <div className="chart-header">
            <h3 className="chart-title">Distribución de Gastos</h3>
          </div>
          <div style={{ height: 420, display: 'flex', alignItems: 'center' }}>
            {expenseByCategory.length > 0 ? (
              <div style={{ width: '50%', height: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={100}
                    outerRadius={140}
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
              <div style={{ width: '50%', maxHeight: 400, overflowY: 'auto', paddingLeft: 'var(--space-4)' }}>
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
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Transacciones Recientes</h3>
          </div>
          {recentTransactions.length > 0 ? (
            <div className="flex flex-col gap-4">
              {recentTransactions.map((t) => {
                const cat = categories.find(c => c.id === t.categoryId);
                return (
                  <div key={t.id} className="flex items-center justify-between gap-3" style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', minWidth: 0, padding: 'var(--space-3) var(--space-6)' }}>
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
        <div className="card">
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
            {/* Days header */}
            {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
              <div key={i} className="text-xs font-bold text-muted mb-2">{d}</div>
            ))}
            
            {/* Empty slots for first day offset (simplified, assuming month starts on Mon for UI mockup, real logic would calculate offset) */}
            {Array.from({ length: new Date(currentYear, currentMonth, 1).getDay() || 7 - 1 }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {/* Days */}
            {calendarDays.map((day) => (
              <div 
                key={day.day} 
                className="tooltip-container flex items-center justify-center"
                style={{
                  aspectRatio: '1',
                  borderRadius: 'var(--radius-sm)',
                  background: day.color,
                  border: day.hasActivity ? 'none' : '1px solid var(--border-primary)',
                  fontSize: 'var(--font-xs)',
                  fontWeight: day.hasActivity ? 'bold' : 'normal',
                  color: day.hasActivity ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  cursor: 'pointer'
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
    </div>
  );
}
