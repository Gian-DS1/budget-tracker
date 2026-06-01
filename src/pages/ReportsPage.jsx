// FinTrack RD — Reports & Analytics Page

import { useState, useMemo } from 'react';
import {
  TrendingUp,
  AlertOctagon,
  Lightbulb,
  AlertTriangle
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import useTransactionStore from '../stores/useTransactionStore';
import useCategoryStore from '../stores/useCategoryStore';
import useDebtStore from '../stores/useDebtStore';
import { Skeleton } from '../components/ui/Skeleton';
import InfoTooltip from '../components/ui/InfoTooltip';
import { formatCurrency, formatCurrencyCompact } from '../utils/formatters';
import { MONTHS_SHORT_ES } from '../utils/constants';
import { detectAnomalies, movingAverage, getMonthlySavingCapacity, getFinancialHealthScore } from '../utils/calculations';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="card-glass" style={{ padding: 'var(--space-3)' }}>
        <p className="font-semibold mb-2">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex justify-between items-center text-sm mb-1 gap-4">
            <span style={{ color: entry.color }}>
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

export default function ReportsPage() {
  const { transactions } = useTransactionStore();
  const txLoading = useTransactionStore((s) => s.loading);
  const { categories } = useCategoryStore();
  const { debts } = useDebtStore();
  const getTotalMonthlyPayment = useDebtStore((s) => s.getTotalMonthlyPayment);

  // Esqueleto solo en carga en frío: evita el falso "Salud financiera 0/100 ·
  // Crítico" antes de que hidraten las transacciones.
  const showSkeleton = txLoading && transactions.length === 0;

  const [activeTab, setActiveTab] = useState('projections');

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // ─── Projections & Trends ─────────────────────────────────────────

  const monthlyData = useMemo(() => {
    // Get last 12 months data
    const data = [];
    for (let i = 11; i >= 0; i--) {
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

      let income = 0;
      let expense = 0;
      monthTxs.forEach((t) => {
        if (t.type === 'income') income += Number(t.amount);
        if (t.type === 'expense' || t.type === 'fixed_expense' || t.type === 'variable_expense') {
          // Gasto efectivo: neto del cashback generado por la transacción.
          expense += Number(t.amount) - Number(t.cashbackEarned || 0);
        }
      });
      
      data.push({
        name: MONTHS_SHORT_ES[m],
        monthIndex: m,
        year: y,
        Ingresos: income,
        Gastos: expense,
      });
    }
    return data;
  }, [transactions, currentMonth, currentYear]);

  const projectionData = useMemo(() => {
    if (monthlyData.length < 3) return monthlyData;

    const expenses = monthlyData.map(d => d.Gastos);
    const incomes = monthlyData.map(d => d.Ingresos);
    
    // Calculate 3-month moving average
    const expMA = movingAverage(expenses, 3);
    const incMA = movingAverage(incomes, 3);

    // Predict next month
    const nextMonthExp = expMA[expMA.length - 1];
    const nextMonthInc = incMA[incMA.length - 1];

    let nextM = currentMonth + 1;
    if (nextM > 11) nextM = 0;

    return [
      ...monthlyData,
      {
        name: `${MONTHS_SHORT_ES[nextM]} (Proyección)`,
        isProjection: true,
        GastosEstimados: nextMonthExp,
        IngresosEstimados: nextMonthInc
      }
    ];
  }, [monthlyData, currentMonth]);


  // ─── Anomaly Detection ──────────────────────────────────────────

  const anomalies = useMemo(() => {
    // Group expenses by category across months to find unusual spikes
    const activeCategories = categories.filter(c => 
      c.type === 'expense' || c.type === 'fixed_expense' || c.type === 'variable_expense'
    );

    const detected = [];

    activeCategories.forEach(cat => {
      // Get monthly totals for this category
      const monthlyTotals = monthlyData.map(md => {
        const txs = transactions.filter(t => {
          const d = new Date(t.date + 'T00:00:00');
          return d.getFullYear() === md.year && d.getMonth() === md.monthIndex && t.categoryId === cat.id;
        });
        return txs.reduce((sum, t) => sum + Number(t.amount) - Number(t.cashbackEarned || 0), 0);
      });

      // Need at least 3 months of data to find anomalies
      const nonZeroMonths = monthlyTotals.filter(v => v > 0);
      if (nonZeroMonths.length >= 3) {
        // We only care about the current/last month for alerting
        const recentValue = monthlyTotals[monthlyTotals.length - 1];
        if (recentValue > 0) {
          const pastValues = monthlyTotals.slice(0, -1);
          const results = detectAnomalies([...pastValues, recentValue], 1.8); // 1.8 std deviations
          
          const recentAnomaly = results.find(r => r.index === monthlyTotals.length - 1);
          if (recentAnomaly) {
            const mean = pastValues.reduce((a,b)=>a+b,0) / pastValues.length;
            detected.push({
              category: cat,
              currentValue: recentValue,
              averageValue: mean,
              increase: ((recentValue - mean) / mean) * 100
            });
          }
        }
      }
    });

    return detected.sort((a, b) => b.increase - a.increase);
  }, [monthlyData, transactions, categories]);


  // ─── Debt Strategies ────────────────────────────────────────────

  const debtStrategies = useMemo(() => {
    const activeDebts = debts.filter(d => d.status === 'active');
    if (activeDebts.length === 0) return null;

    // Avalanche: highest interest first
    const avalanche = [...activeDebts].sort((a, b) => b.interestRate - a.interestRate);
    
    // Snowball: lowest balance first
    const snowball = [...activeDebts].sort((a, b) => a.currentBalance - b.currentBalance);

    return { avalanche, snowball };
  }, [debts]);

  // ─── Salud financiera y promedios (KPIs inteligentes) ───────────

  const cap = useMemo(
    () => getMonthlySavingCapacity(transactions, new Date(), 3),
    [transactions]
  );
  const monthlyDebt = getTotalMonthlyPayment();
  const health = useMemo(
    () => getFinancialHealthScore({ avgIncome: cap.avgIncome, avgExpense: cap.avgExpense, monthlyDebt }),
    [cap, monthlyDebt]
  );
  const savingsRatePct = cap.avgIncome > 0 ? (cap.capacity / cap.avgIncome) * 100 : 0;
  const healthColor =
    health.score >= 80 ? 'var(--color-success)'
    : health.score >= 60 ? 'var(--color-info)'
    : health.score >= 40 ? 'var(--color-warning)'
    : 'var(--color-danger)';

  const lastProj = projectionData[projectionData.length - 1] || {};
  const forecastInc = lastProj.IngresosEstimados || 0;
  const forecastExp = lastProj.GastosEstimados || 0;

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <div className="page-container page-fit reports-page-fit">
      <div className="page-header" id="tour-reports-header">
        <h1 className="page-title">Análisis e inteligencia</h1>
        <p className="page-subtitle">Proyecciones predictivas y recomendaciones</p>
      </div>

      {showSkeleton ? (
        <div className="reports-tab" role="status" aria-label="Cargando el análisis">
          <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={`sk-r-${i}`} className="kpi-card">
                <Skeleton width={120} height={12} style={{ marginBottom: 'var(--space-3)' }} />
                <Skeleton width="60%" height={22} style={{ marginBottom: 'var(--space-3)' }} />
                <Skeleton width="85%" height={11} />
              </div>
            ))}
          </div>
          <div className="card reports-chart-card">
            <Skeleton width="40%" height={16} style={{ marginBottom: 'var(--space-6)' }} />
            <Skeleton width="100%" height={300} radius="var(--radius-lg)" style={{ flex: 1 }} />
          </div>
        </div>
      ) : (
       <>
      {/* Tabs */}
      <div className="tabs" style={{ maxWidth: 'fit-content' }}>
        <button
          className={`tab flex-1 flex flex-col items-center justify-center gap-1 ${activeTab === 'projections' ? 'active' : ''}`}
          style={{ paddingTop: 'var(--space-3)', paddingBottom: 'var(--space-3)' }}
          onClick={() => setActiveTab('projections')}
        >
          <TrendingUp size={16} /> Proyecciones
        </button>
        <button
          className={`tab flex-1 flex flex-col items-center justify-center gap-1 ${activeTab === 'anomalies' ? 'active' : ''}`}
          style={{ paddingTop: 'var(--space-3)', paddingBottom: 'var(--space-3)' }}
          onClick={() => setActiveTab('anomalies')}
        >
          <AlertOctagon size={16} /> Anomalías
        </button>
        <button
          className={`tab flex-1 flex flex-col items-center justify-center gap-1 ${activeTab === 'debts' ? 'active' : ''}`}
          style={{ paddingTop: 'var(--space-3)', paddingBottom: 'var(--space-3)' }}
          onClick={() => setActiveTab('debts')}
        >
          <Lightbulb size={16} /> Estrategia Deuda
        </button>
      </div>

      {/* ─── TAB: Projections ─── */}
      {activeTab === 'projections' && (
        <div className="reports-tab animate-tab-content">
          {/* KPIs inteligentes */}
          <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
            <div className="kpi-card" style={{ '--kpi-accent': 'var(--color-income)' }}>
              <div className="kpi-label">Ingreso prom. / mes</div>
              <div className="kpi-value" style={{ fontSize: 'clamp(0.95rem, 1.7vw, 1.25rem)' }}>{formatCurrency(cap.avgIncome)}</div>
              <div className="text-xs text-muted mt-2">Últimos {cap.monthsCounted || 0} mes(es) con datos</div>
            </div>
            <div className="kpi-card" style={{ '--kpi-accent': 'var(--color-expense)' }}>
              <div className="kpi-label">Gasto prom. / mes</div>
              <div className="kpi-value" style={{ fontSize: 'clamp(0.95rem, 1.7vw, 1.25rem)' }}>{formatCurrency(cap.avgExpense)}</div>
              <div className="text-xs text-muted mt-2">Proyección próx.: {formatCurrency(forecastExp)}</div>
            </div>
            <div className="kpi-card" style={{ '--kpi-accent': 'var(--accent-primary)' }}>
              <div className="kpi-label">Tasa de ahorro</div>
              <div className="kpi-value" style={{ fontSize: 'clamp(0.95rem, 1.7vw, 1.25rem)', color: savingsRatePct >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                {savingsRatePct.toFixed(1)}%
              </div>
              <div className="text-xs text-muted mt-2">De tus ingresos promedio</div>
            </div>
            <div className="kpi-card" style={{ '--kpi-accent': healthColor }}>
              <div className="kpi-label flex items-center gap-1">
                Salud financiera
                <InfoTooltip text="Score del 0 al 100 que combina tu tasa de ahorro, el peso de tus deudas y tu cumplimiento de gastos sobre los últimos meses. Más alto es mejor." label="Cómo se calcula la salud financiera" />
              </div>
              <div className="kpi-value" style={{ fontSize: 'clamp(0.95rem, 1.7vw, 1.25rem)', color: healthColor }}>{health.score}/100</div>
              <div className="text-xs mt-2" style={{ color: healthColor, fontWeight: 600 }}>{health.label}</div>
            </div>
          </div>

          <div className="card reports-chart-card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Proyección de ingresos y gastos</h3>
                <p className="text-sm text-muted">
                  Histórico de 12 meses. Estimado próx. mes: ingresos ~{formatCurrency(forecastInc)}, gastos ~{formatCurrency(forecastExp)}
                </p>
              </div>
            </div>

            <div style={{ flex: 1, minHeight: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={projectionData} margin={{ top: 20, right: 20, left: 10, bottom: 20 }}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-income)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--color-income)" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-expense)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--color-expense)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-secondary)" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} dy={10} />
                  <YAxis tickFormatter={(val) => formatCurrencyCompact(val)} tick={{ fontSize: 12, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} dx={-10} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ paddingBottom: '20px' }} />
                  
                  {/* Historical Data */}
                  <Area type="monotone" dataKey="Ingresos" stroke="var(--color-income)" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={3} activeDot={{ r: 6 }} />
                  <Area type="monotone" dataKey="Gastos" stroke="var(--color-expense)" fillOpacity={1} fill="url(#colorExpense)" strokeWidth={3} activeDot={{ r: 6 }} />
                  
                  {/* Projected Data */}
                  <Area type="monotone" dataKey="IngresosEstimados" name="Proyección Ingresos" stroke="var(--accent-secondary)" fill="none" strokeWidth={3} strokeDasharray="5 5" activeDot={{ r: 6 }} />
                  <Area type="monotone" dataKey="GastosEstimados" name="Proyección Gastos" stroke="var(--color-variable)" fill="none" strokeWidth={3} strokeDasharray="5 5" activeDot={{ r: 6 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB: Anomalies ─── */}
      {activeTab === 'anomalies' && (
        <div className="reports-tab-scroll animate-tab-content">
          <div className="alert alert-info">
            <Lightbulb size={16} />
            <span>
              La detección de anomalías analiza tu historial de gastos buscando categorías que se desvían significativamente de tu promedio habitual este mes.
            </span>
          </div>

          {anomalies.length === 0 ? (
            <div className="card flex flex-col items-center justify-center text-center" style={{ padding: 'var(--space-12)' }}>
              <div style={{ background: 'var(--color-income-bg)', padding: 'var(--space-4)', borderRadius: '50%', marginBottom: 'var(--space-4)' }}>
                <TrendingUp size={40} className="text-success" />
              </div>
              <h3 className="font-bold text-lg mb-2">Todo luce normal</h3>
              <p className="text-muted" style={{ maxWidth: '28rem' }}>
                No hemos detectado picos inusuales en tus gastos este mes. ¡Sigue así, estás manteniendo tus finanzas estables!
              </p>
            </div>
          ) : (
            <div className="grid-auto">
              {anomalies.map((anomaly, idx) => (
                <div key={idx} className="card" style={{ borderTop: '3px solid var(--color-danger)' }}>
                  <div className="flex items-center gap-3 mb-4">
                    <span style={{ fontSize: '2rem' }}>{anomaly.category.icon}</span>
                    <div>
                      <h3 className="font-bold">{anomaly.category.name}</h3>
                      <span className="badge badge-expense flex items-center gap-1">
                        <AlertTriangle size={12} /> Desviación
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-end mb-4">
                    <div>
                      <div className="text-xs text-muted mb-1">Gasto este mes</div>
                      <div className="font-bold text-xl amount-negative">
                        {formatCurrency(anomaly.currentValue)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted mb-1">Promedio habitual</div>
                      <div className="font-semibold text-muted">
                        {formatCurrency(anomaly.averageValue)}
                      </div>
                    </div>
                  </div>

                  <div className="progress-bar" style={{ background: 'var(--bg-tertiary)', marginBottom: 'var(--space-4)' }}>
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: '100%',
                        background: 'var(--color-danger)'
                      }}
                    />
                  </div>
                  
                  <p className="text-sm">
                    Has gastado un <strong className="text-danger">+{Math.round(anomaly.increase)}%</strong> por encima de tu promedio en esta categoría. Considera revisar tus transacciones recientes.
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB: Debts ─── */}
      {activeTab === 'debts' && (
        <div className="reports-tab-scroll animate-tab-content">
          {!debtStrategies ? (
            <div className="card text-center" style={{ padding: 'var(--space-12) var(--space-6)' }}>
              <h3 className="font-bold text-lg mb-2">No tienes deudas activas</h3>
              <p className="text-muted">¡Felicidades! Mantenerte libre de deudas es excelente para tu salud financiera.</p>
            </div>
          ) : (
            <div className="grid-2">
              <div className="card" style={{ borderTop: '3px solid var(--color-variable)' }}>
                <div className="card-header">
                  <h3 className="card-title flex items-center gap-2">
                    ❄️ Método Bola de Nieve
                  </h3>
                </div>
                <p className="text-sm text-muted mb-6">
                  Se enfoca en pagar primero la deuda con el <strong>saldo más pequeño</strong>. Ideal para obtener victorias rápidas y motivación psicológica.
                </p>
                
                <div className="flex flex-col" style={{ gap: 'var(--space-3)' }}>
                  {debtStrategies.snowball.map((debt, index) => (
                    <div key={debt.id} className="flex items-center gap-4" style={{ padding: 'var(--space-3)', background: index === 0 ? 'var(--color-variable-bg)' : 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                      <div className="font-bold text-lg" style={{ color: index === 0 ? 'var(--color-variable)' : 'var(--text-tertiary)' }}>
                        #{index + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div className="font-semibold">{debt.creditorName}</div>
                        <div className="text-xs text-muted">Saldo: {formatCurrency(debt.currentBalance)}</div>
                      </div>
                      {index === 0 && <span className="badge badge-variable">Pagar extra Aquí</span>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="card" style={{ borderTop: '3px solid var(--color-danger)' }}>
                <div className="card-header">
                  <h3 className="card-title flex items-center gap-2">
                    🗻 Método Avalancha
                  </h3>
                </div>
                <p className="text-sm text-muted mb-6">
                  Se enfoca en pagar primero la deuda con la <strong>tasa de interés más alta</strong>. Matemáticamente es el método donde ahorras más dinero en intereses.
                </p>
                
                <div className="flex flex-col" style={{ gap: 'var(--space-3)' }}>
                  {debtStrategies.avalanche.map((debt, index) => (
                    <div key={debt.id} className="flex items-center gap-4" style={{ padding: 'var(--space-3)', background: index === 0 ? 'var(--color-expense-bg)' : 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                      <div className="font-bold text-lg" style={{ color: index === 0 ? 'var(--color-danger)' : 'var(--text-tertiary)' }}>
                        #{index + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div className="font-semibold">{debt.creditorName}</div>
                        <div className="text-xs text-muted">Interés: {debt.interestRate}%</div>
                      </div>
                      {index === 0 && <span className="badge badge-expense">Pagar extra Aquí</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
       </>
      )}

    </div>
  );
}
