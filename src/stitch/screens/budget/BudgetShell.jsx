// Wrapper compartido de Presupuesto. Eleva el mes seleccionado y calcula el
// contexto común (transacciones del mes, pago de deuda real, summary), y delega
// el render a la sub-vista según el nivel elegido (tracking / 503020 / zero).
import { useMemo, useState } from 'react';
import MS from '../../MS';
import StitchSelect from '../../StitchSelect';
import usePrefsStore from '../../../stores/usePrefsStore';
import useBudgetStore from '../../../stores/useBudgetStore';
import useTransactionStore from '../../../stores/useTransactionStore';
import useCategoryStore from '../../../stores/useCategoryStore';
import useDebtStore from '../../../stores/useDebtStore';
import { getBudgetSummary } from '../../../utils/calculations';
import { monthName } from '../../../i18n/runtime';
import { useI18n } from '../../../contexts/I18nContext';
import BudgetZero from './BudgetZero';
import Budget503020 from './Budget503020';
import BudgetTracking from './BudgetTracking';

const ESTADO_COLOR = { good: 'text-tertiary', warning: 'text-accent-warning', danger: 'text-accent-error', neutral: 'text-text-muted' };

export default function BudgetShell({ level = 'zero' }) {
  const { t } = useI18n();

  const ESTADO_LABEL = {
    good: t('screens.budget.stateOptimal'),
    warning: t('screens.budget.stateTight'),
    danger: t('screens.budget.stateAtRisk'),
    neutral: t('screens.budget.stateNoData'),
  };

  // Metadatos del nivel (título + subtítulo del header). Cada nivel habla el
  // idioma de su público (decisión de producto).
  const LEVEL_META = {
    tracking: { tag: t('screens.budget.tagTracking'), dot: 'bg-secondary' },
    '503020': { tag: t('screens.budget.tag503020'), dot: 'bg-tertiary' },
    zero: { tag: t('screens.budget.tagZero'), dot: 'bg-secondary' },
  };

  const LEVEL_OPTIONS = [
    { value: 'tracking', label: t('screens.budget.trackingMode'), icon: 'visibility' },
    { value: '503020', label: '50 / 30 / 20', icon: 'pie_chart' },
    { value: 'zero', label: t('screens.budget.zeroMode'), icon: 'account_balance_wallet' },
  ];

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const setBudgetLevel = usePrefsStore((s) => s.setBudgetLevel);

  const budgets = useBudgetStore((s) => s.budgets);
  const transactions = useTransactionStore((s) => s.transactions);
  const categories = useCategoryStore((s) => s.categories);
  const payments = useDebtStore((s) => s.payments);
  const getTotalMonthlyPayment = useDebtStore((s) => s.getTotalMonthlyPayment);

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
  const navMonth = (dir) => {
    if (dir > 0 && isCurrentMonth) return;
    let mm = month + dir, yy = year;
    if (mm < 0) { mm = 11; yy--; } else if (mm > 11) { mm = 0; yy++; }
    setMonth(mm); setYear(yy);
  };

  const monthBudgets = useMemo(() => budgets.filter((b) => b.year === year && b.month === month), [budgets, year, month]);
  const monthTx = useMemo(
    () => transactions.filter((t) => {
      const d = new Date(t.date + 'T00:00:00');
      return d.getFullYear() === year && d.getMonth() === month;
    }),
    [transactions, year, month],
  );

  // Pago de deuda real del mes.
  const debtPaid = useMemo(
    () => payments.reduce((sum, p) => {
      const d = new Date(p.date + 'T00:00:00');
      if (d.getFullYear() !== year || d.getMonth() !== month) return sum;
      return sum + (Number(p.amount) || 0);
    }, 0),
    [payments, year, month],
  );

  // Categoría de deuda (slug estable; respaldo por nombre para cuentas previas a
  // la migración del slug). Mismo criterio que la sincronización Deudas→Tx en
  // useDebtStore. El summary la trata especial para no contar la deuda dos veces.
  const debtCategoryId = useMemo(() => {
    const c = categories.find((x) => x.slug === 'pago-deuda')
      || categories.find((x) => x.name === 'Pago de Préstamos y Deudas' || (x.name && x.name.includes('Préstamos')));
    return c?.id || null;
  }, [categories]);

  const summary = useMemo(
    () => getBudgetSummary({ monthTransactions: monthTx, monthBudgets, categories, debtPlanned: getTotalMonthlyPayment(), debtPaid, debtCategoryId }),
    [monthTx, monthBudgets, categories, getTotalMonthlyPayment, debtPaid, debtCategoryId],
  );

  const meta = LEVEL_META[level] || LEVEL_META.zero;
  const viewProps = { year, month, monthBudgets, monthTx, categories, summary, debtCategoryId };

  return (
    <div className="p-md sm:p-margin-safe max-w-[1728px] mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-xl gap-lg">
        <div>
          <div className="flex items-center gap-sm mb-xs">
            <div className={`w-1.5 h-1.5 rounded-full ${meta.dot} live-dot`} />
            <span className="font-mono-data text-mono-data text-on-surface-variant uppercase">{meta.tag}</span>
          </div>
          <h1 className="font-hero-headline text-headline-lg md:text-[56px] text-on-background tracking-tighter leading-none">{t('budget.title').toUpperCase()}</h1>
          {/* Cambiador rápido de nivel */}
          <div data-tour="budget-mode" className="flex items-center gap-sm mt-md">
            <span className="font-mono-data text-mono-data text-text-muted uppercase">{t('screens.budget.mode')}</span>
            <StitchSelect value={level} onChange={setBudgetLevel} options={LEVEL_OPTIONS} compact className="min-w-[150px]" />
          </div>
        </div>
        <div className="flex gap-md bg-surface-card p-sm rounded border border-border-subtle inner-glow items-center">
          <button onClick={() => navMonth(-1)} className="p-xs rounded hover:bg-surface-container-high text-on-surface-variant"><MS name="chevron_left" className="text-[18px]" /></button>
          <div className="flex flex-col px-sm py-xs border-x border-border-subtle text-center min-w-[120px]">
            <span className="font-mono-data text-mono-data text-text-muted">{t('screens.budget.period').toUpperCase()}</span>
            <span className="font-label-sm text-label-sm text-on-background mt-1">{monthName(month)} {year}</span>
          </div>
          <button onClick={() => navMonth(1)} disabled={isCurrentMonth} className="p-xs rounded hover:bg-surface-container-high text-on-surface-variant disabled:opacity-30"><MS name="chevron_right" className="text-[18px]" /></button>
          <div className="flex flex-col px-md py-xs">
            <span className="font-mono-data text-mono-data text-text-muted">{t('common.status').toUpperCase()}</span>
            <span className={`font-label-sm text-label-sm mt-1 ${ESTADO_COLOR[summary.estado]}`}>{ESTADO_LABEL[summary.estado]}</span>
          </div>
        </div>
      </div>

      {/* Sub-vista según el nivel */}
      {level === 'tracking' && <BudgetTracking {...viewProps} />}
      {level === '503020' && <Budget503020 {...viewProps} />}
      {level === 'zero' && <BudgetZero {...viewProps} />}
    </div>
  );
}
