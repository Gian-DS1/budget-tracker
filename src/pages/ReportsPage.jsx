// FinTrack RD — Reports & Analytics Page

import { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  AlertOctagon, 
  Lightbulb, 
  BarChart2,
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
import { formatCurrency, formatCurrencyCompact, MONTHS_SHORT_ES } from '../utils/formatters';
import { detectAnomalies, movingAverage } from '../utils/calculations';

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
  const { categories } = useCategoryStore();
  const { debts } = useDebtStore();

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
          expense += Number(t.amount);
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
  }, [monthlyData]);


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
        return txs.reduce((sum, t) => sum + Number(t.amount), 0);
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

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Análisis e Inteligencia</h1>
        <p className="page-subtitle">Proyecciones predictivas y recomendaciones</p>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ maxWidth: 450 }}>
        <button 
          className={`tab flex-1 ${activeTab === 'projections' ? 'active' : ''}`}
          onClick={() => setActiveTab('projections')}
        >
          <TrendingUp size={16} className="inline mr-2" /> Proyecciones
        </button>
        <button 
          className={`tab flex-1 ${activeTab === 'anomalies' ? 'active' : ''}`}
          onClick={() => setActiveTab('anomalies')}
        >
          <AlertOctagon size={16} className="inline mr-2" /> Anomalías
        </button>
        <button 
          className={`tab flex-1 ${activeTab === 'debts' ? 'active' : ''}`}
          onClick={() => setActiveTab('debts')}
        >
          <Lightbulb size={16} className="inline mr-2" /> Estrategia Deuda
        </button>
      </div>

      {/* ─── TAB: Projections ─── */}
      {activeTab === 'projections' && (
        <div className="space-y-6">
          <div className="grid-2 mb-6">
            <div className="card" style={{ background: 'var(--color-income-bg)' }}>
              <h4 className="font-bold mb-2 flex items-center gap-2 text-success">
                <TrendingUp size={18} /> Forecast de Ingresos
              </h4>
              <p className="text-sm">
                Basado en tu historial, se estima que tus ingresos el próximo mes serán de{' '}
                <strong className="text-lg amount-positive">
                  {formatCurrency(projectionData[projectionData.length - 1]?.IngresosEstimados || 0)}
                </strong>
              </p>
            </div>
            <div className="card" style={{ background: 'var(--color-expense-bg)' }}>
              <h4 className="font-bold mb-2 flex items-center gap-2 text-danger">
                <BarChart2 size={18} /> Forecast de Gastos
              </h4>
              <p className="text-sm">
                Se proyecta que tus gastos alcancen{' '}
                <strong className="text-lg amount-negative">
                  {formatCurrency(projectionData[projectionData.length - 1]?.GastosEstimados || 0)}
                </strong>. ¡Ajusta tu presupuesto de antemano!
              </p>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Proyección de Ingresos y Gastos</h3>
                <p className="text-sm text-muted">Evolución histórica y estimaciones para el próximo mes</p>
              </div>
            </div>
            
            <div style={{ height: 400 }}>
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
        <div>
          <div className="alert alert-info">
            <Lightbulb size={16} />
            <span>
              La detección de anomalías analiza tu historial de gastos buscando categorías que se desvían significativamente de tu promedio habitual este mes.
            </span>
          </div>

          {anomalies.length === 0 ? (
            <div className="card flex flex-col items-center justify-center p-12 text-center">
              <div style={{ background: 'var(--color-income-bg)', padding: 'var(--space-4)', borderRadius: '50%', marginBottom: 'var(--space-4)' }}>
                <TrendingUp size={40} className="text-success" />
              </div>
              <h3 className="font-bold text-lg mb-2">Todo luce normal</h3>
              <p className="text-muted max-w-md">
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
                      className="progress-bar-fill bg-danger" 
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
        <div>
          {!debtStrategies ? (
            <div className="card text-center py-12">
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
                
                <div className="space-y-4">
                  {debtStrategies.snowball.map((debt, index) => (
                    <div key={debt.id} className="flex items-center gap-4 p-3" style={{ background: index === 0 ? 'var(--color-variable-bg)' : 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                      <div className="font-bold text-lg" style={{ color: index === 0 ? 'var(--color-variable)' : 'var(--text-muted)' }}>
                        #{index + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div className="font-semibold">{debt.creditorName}</div>
                        <div className="text-xs text-muted">Saldo: {formatCurrency(debt.currentBalance)}</div>
                      </div>
                      {index === 0 && <span className="badge badge-variable">Pagar Extra Aquí</span>}
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
                
                <div className="space-y-4">
                  {debtStrategies.avalanche.map((debt, index) => (
                    <div key={debt.id} className="flex items-center gap-4 p-3" style={{ background: index === 0 ? 'var(--color-expense-bg)' : 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                      <div className="font-bold text-lg" style={{ color: index === 0 ? 'var(--color-danger)' : 'var(--text-muted)' }}>
                        #{index + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div className="font-semibold">{debt.creditorName}</div>
                        <div className="text-xs text-muted">Interés: {debt.interestRate}%</div>
                      </div>
                      {index === 0 && <span className="badge badge-expense">Pagar Extra Aquí</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
