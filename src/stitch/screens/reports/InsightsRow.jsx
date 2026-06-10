// 4 tarjetas de insight derivadas del periodo. Recibe el objeto de getInsights.
import { InsightCard } from './reportsUi';
import { useI18n } from '../../../contexts/I18nContext';
import { formatCurrency } from '../../../utils/formatters';

const fmt = (n) => formatCurrency(n);

export default function InsightsRow({ insights }) {
  const { t } = useI18n();
  const { avgMonthlyExpense, topMonth, topCategory, avgSavingsRate } = insights;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
      <InsightCard label={t('screens.reports.avgMonthlyExpense')} icon="trending_flat" value={fmt(avgMonthlyExpense)} sub={t('screens.reports.inPeriod')} />
      <InsightCard label={t('screens.reports.topSpendMonth')} icon="trending_up" cls="text-accent-warning"
        value={topMonth ? topMonth.label : '—'} sub={topMonth ? fmt(topMonth.amount) : t('pages.noData')} />
      <InsightCard label={t('screens.reports.mostExpensiveCategory')} icon="local_fire_department" cls="text-accent-error"
        value={topCategory ? topCategory.name : '—'} sub={topCategory ? fmt(topCategory.amount) : t('pages.noData')} />
      <InsightCard label={t('dashboard.savingsRate')} icon="savings"
        cls={avgSavingsRate >= 0.2 ? 'text-tertiary' : 'text-on-surface-variant'}
        value={`${(avgSavingsRate * 100).toFixed(0)}%`} sub={t('dashboard.ofIncome')} />
    </div>
  );
}
