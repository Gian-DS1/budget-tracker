// Reportes — centro de análisis: KPIs de salud + 4 visualizaciones temporales
// con selector de rango (6/12/24 meses). Lógica pura en reports/selectors.js;
// salud reusa utils (incluye mes actual, como el Dashboard). Solo lectura.
import { useMemo, useState } from 'react';
import { Stagger } from '../StitchMotion';
import StitchSelect from '../StitchSelect';
import MS from '../MS';
import useTransactionStore from '../../stores/useTransactionStore';
import useCategoryStore from '../../stores/useCategoryStore';
import useDebtStore from '../../stores/useDebtStore';
import { getFinancialHealthScore, getMonthlySavingCapacity } from '../../utils/calculations';
import { formatCurrency } from '../../utils/formatters';
import { MONTHS_SHORT_ES } from '../../utils/constants';
import { getIncomeVsExpenseSeries, getCategoryTrend, getMonthComparison, getInsights } from './reports/selectors';
import { getAnalysis } from './reports/analysis';
import { ReportCard, Kpi } from './reports/reportsUi';
import { InfoTip } from '../InfoTip';
import CountUp from '../CountUp';
import AnalysisPanel from './reports/AnalysisPanel';
import IncomeExpenseBars from './reports/IncomeExpenseBars';
import CategoryTrendLines from './reports/CategoryTrendLines';
import MonthComparison from './reports/MonthComparison';
import InsightsRow from './reports/InsightsRow';

const fmt = (n) => formatCurrency(n);

const RANGE_OPTIONS = [
  { value: '6', label: 'Últimos 6 meses' },
  { value: '12', label: 'Últimos 12 meses' },
  { value: '24', label: 'Últimos 24 meses' },
];

export default function StitchReports() {
  const { transactions } = useTransactionStore();
  const { categories } = useCategoryStore();
  const getTotalMonthlyPayment = useDebtStore((s) => s.getTotalMonthlyPayment);

  const now = useMemo(() => new Date(), []);
  const y = now.getFullYear();
  const m = now.getMonth();
  const [range, setRange] = useState(12);

  // Salud (incluye el mes actual, honesta y reactiva — como el Dashboard).
  const cap = useMemo(() => getMonthlySavingCapacity(transactions, now, 3, true), [transactions, now]);
  const health = useMemo(() => getFinancialHealthScore({ avgIncome: cap.avgIncome, avgExpense: cap.avgExpense, monthlyDebt: getTotalMonthlyPayment() }), [cap, getTotalMonthlyPayment]);
  const healthColor = health.score >= 80 ? '#bdd200' : health.score >= 60 ? '#50d8e9' : health.score >= 40 ? '#ffb689' : '#ffb4ab';

  // Gasto del mes actual (para el KPI).
  const monthExpenses = useMemo(() => transactions.filter((t) => {
    const d = new Date(t.date + 'T00:00:00');
    return d.getFullYear() === y && d.getMonth() === m && ['expense', 'fixed_expense', 'variable_expense'].includes(t.type);
  }), [transactions, y, m]);
  const monthExpenseTotal = useMemo(() => monthExpenses.reduce((s, t) => s + Number(t.amount) - Number(t.cashbackEarned || 0), 0), [monthExpenses]);

  // Análisis temporales (dependen del rango).
  const incomeExpense = useMemo(() => getIncomeVsExpenseSeries(transactions, range, now), [transactions, range, now]);
  const trend = useMemo(() => getCategoryTrend(transactions, categories, range, now, 5), [transactions, categories, range, now]);
  const comparison = useMemo(() => getMonthComparison(transactions, categories, now), [transactions, categories, now]);
  const insights = useMemo(() => getInsights(transactions, categories, range, now), [transactions, categories, range, now]);

  // Análisis inteligente: arma los insumos a partir de lo ya calculado.
  const analysis = useMemo(() => {
    // Categoría que más subió vs mes anterior (mayor delta absoluto positivo).
    const risen = comparison.filter((c) => c.current > c.previous);
    const topRising = risen.length
      ? { name: risen[0].name, deltaPct: risen[0].deltaPct ?? 100, deltaAbs: risen[0].current - risen[0].previous }
      : null;

    // Concentración: categoría top del mes actual y su % del gasto del mes.
    const totalCurrent = comparison.reduce((s, c) => s + c.current, 0);
    const topCat = comparison.reduce((best, c) => (c.current > (best?.current || 0) ? c : best), null);
    const concentration = topCat && totalCurrent > 0
      ? { name: topCat.name, pct: (topCat.current / totalCurrent) * 100 }
      : null;

    // Tendencia del gasto: primera mitad vs segunda mitad del rango.
    const exp = incomeExpense.map((x) => x.expense);
    const half = Math.floor(exp.length / 2);
    const firstAvg = half ? exp.slice(0, half).reduce((s, v) => s + v, 0) / half : 0;
    const secondAvg = (exp.length - half) ? exp.slice(half).reduce((s, v) => s + v, 0) / (exp.length - half) : 0;
    let trendDirection = 'flat';
    if (firstAvg > 0) {
      const change = (secondAvg - firstAvg) / firstAvg;
      if (change > 0.1) trendDirection = 'up';
      else if (change < -0.1) trendDirection = 'down';
    }

    const dti = cap.avgIncome > 0 ? getTotalMonthlyPayment() / cap.avgIncome : 0;
    const hasData = transactions.length > 0 && cap.avgIncome > 0;

    return getAnalysis({ savingsRate: health.savingsRate, topRising, concentration, trendDirection, dti, hasData });
  }, [comparison, incomeExpense, cap, getTotalMonthlyPayment, health.savingsRate, transactions.length]);

  return (
    <div className="max-w-[1728px] mx-auto p-md sm:p-margin-safe w-full">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-lg border-b border-border-subtle pb-lg mb-xl">
        <div>
          <div className="flex items-center gap-sm mb-md">
            <span className="bg-surface-container-highest px-sm py-xs rounded font-mono-data text-mono-data text-primary uppercase border border-border-subtle">{MONTHS_SHORT_ES[m]} {y}</span>
            <span className="flex items-center gap-xs font-mono-data text-mono-data text-tertiary uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary status-glow-live" /> Centro de análisis
            </span>
          </div>
          <h1 className="font-hero-headline text-headline-lg md:text-[56px] text-on-background tracking-tighter leading-none">Reportes</h1>
          <p className="font-body-md text-body-md text-text-muted mt-sm max-w-2xl">Análisis de salud financiera, tendencias y distribución del gasto en el tiempo.</p>
        </div>
        <div className="w-[200px] self-start md:self-end">
          <StitchSelect value={String(range)} onChange={(v) => setRange(Number(v))} options={RANGE_OPTIONS} compact />
        </div>
      </header>

      <Stagger className="flex flex-col gap-gutter">
        {/* KPIs salud */}
        <Stagger.Item className="grid grid-cols-2 lg:grid-cols-4 gap-md">
          <div className="bg-surface-panel border border-border-subtle rounded-lg inner-glow p-lg flex flex-col gap-sm">
            <div className="flex justify-between items-start gap-xs">
              <span className="font-mono-data text-mono-data text-text-muted uppercase flex items-center gap-xs min-w-0">
                <span className="truncate">SALUD FINANCIERA</span>
                <InfoTip text="Score 0–100 que combina tu tasa de ahorro, el ratio de gasto y tu carga de deuda (promedio de los últimos meses)." />
              </span>
              <MS name="favorite" className="!text-[16px] shrink-0" style={{ color: healthColor }} />
            </div>
            <span className="font-headline-md text-[20px] tracking-tight whitespace-nowrap" style={{ color: healthColor }}><CountUp value={health.score} format={(n) => String(Math.round(n))} /><span className="text-text-muted text-[15px]">/100</span></span>
            <span className="font-label-sm text-label-sm" style={{ color: healthColor }}>{health.label}</span>
          </div>
          <Kpi l="TASA DE AHORRO" v={<CountUp value={health.savingsRate * 100} format={(n) => `${n.toFixed(0)}%`} />} d={health.savingsRate >= 0.2 ? 'Saludable' : 'Mejorable'} c={health.savingsRate >= 0.2 ? 'text-tertiary' : 'text-accent-warning'} icon="savings" info="(Ingresos − gastos) ÷ ingresos, promediado en los meses del periodo." />
          <Kpi l="GASTO DEL MES" v={<CountUp value={monthExpenseTotal} format={fmt} />} d={`${monthExpenses.length} mov.`} icon="payments" info="Suma de tus gastos del mes actual, neta de cashback." />
          <Kpi l="MOVIMIENTOS" v={<CountUp value={transactions.length} format={(n) => String(Math.round(n))} />} d="en total" icon="receipt_long" />
        </Stagger.Item>

        {/* Análisis inteligente (recomendaciones priorizadas) */}
        <Stagger.Item>
          <AnalysisPanel insights={analysis} />
        </Stagger.Item>

        {/* Ingresos vs gastos por mes */}
        <Stagger.Item>
          <ReportCard title={`Ingresos vs gastos · ${range} meses`} icon="bar_chart">
            <IncomeExpenseBars data={incomeExpense} />
          </ReportCard>
        </Stagger.Item>

        {/* Tendencia de categorías + insights */}
        <Stagger.Item className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
          <div className="lg:col-span-2">
            <ReportCard title="Tendencia de categorías" icon="show_chart" className="h-full">
              <CategoryTrendLines months={trend.months} series={trend.series} />
            </ReportCard>
          </div>
          <div className="lg:col-span-1">
            <InsightsRow insights={insights} />
          </div>
        </Stagger.Item>

        {/* Comparativa mes vs anterior */}
        <Stagger.Item>
          <ReportCard title="Cambios vs mes anterior" icon="compare_arrows">
            <MonthComparison data={comparison} />
          </ReportCard>
        </Stagger.Item>
      </Stagger>
    </div>
  );
}
