// 4 tarjetas de insight derivadas del periodo. Recibe el objeto de getInsights.
import { InsightCard } from './reportsUi';
import { formatCurrency } from '../../../utils/formatters';

const fmt = (n) => formatCurrency(n);

export default function InsightsRow({ insights }) {
  const { avgMonthlyExpense, topMonth, topCategory, avgSavingsRate } = insights;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
      <InsightCard label="Gasto mensual promedio" icon="trending_flat" value={fmt(avgMonthlyExpense)} sub="en el periodo" />
      <InsightCard label="Mes de mayor gasto" icon="trending_up" cls="text-accent-warning"
        value={topMonth ? topMonth.label : '—'} sub={topMonth ? fmt(topMonth.amount) : 'Sin datos'} />
      <InsightCard label="Categoría más cara" icon="local_fire_department" cls="text-accent-error"
        value={topCategory ? topCategory.name : '—'} sub={topCategory ? fmt(topCategory.amount) : 'Sin datos'} />
      <InsightCard label="Tasa de ahorro promedio" icon="savings"
        cls={avgSavingsRate >= 0.2 ? 'text-tertiary' : 'text-on-surface-variant'}
        value={`${(avgSavingsRate * 100).toFixed(0)}%`} sub="del ingreso" />
    </div>
  );
}
