// Resumen (Dashboard) — bento grid ordenado por importancia. Datos reales; la
// lógica pura vive en dashboard/selectors.js y utils/calculations. Solo lectura.
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MS from '../MS';
import { Stagger } from '../StitchMotion';
import StitchSelect from '../StitchSelect';
import { useI18n } from '../../contexts/I18nContext';
import useTransactionStore from '../../stores/useTransactionStore';
import useSavingsStore from '../../stores/useSavingsStore';
import useDebtStore from '../../stores/useDebtStore';
import useCategoryStore from '../../stores/useCategoryStore';
import useBudgetStore from '../../stores/useBudgetStore';
import useCreditCardStore from '../../stores/useCreditCardStore';
import {
  getBudgetSummary, getMonthlySavingCapacity, getFinancialHealthScore,
} from '../../utils/calculations';
import { getCardBalances } from '../../utils/creditCards';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { monthShort } from '../../i18n/runtime';
import { getCategoryBreakdown, getBudgetUsage, getBudgetPace, getCumulativeLiquidWealth } from './dashboard/selectors';
import { BentoCell } from './dashboard/dashboardUi';
import WealthTrendChart from './dashboard/WealthTrendChart';
import CategoryDonut from './dashboard/CategoryDonut';
import BudgetBar from './dashboard/BudgetBar';
import HealthRing from './dashboard/HealthRing';
import SignalsRail from './dashboard/SignalsRail';
import usePrefsStore from '../../stores/usePrefsStore';
import { isDemoActive } from '../demoMode';

const fmt = (n) => formatCurrency(n);

export default function StitchDashboard() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const transactions = useTransactionStore((s) => s.transactions);
  const categories = useCategoryStore((s) => s.categories);
  const getTotalMonthlyPayment = useDebtStore((s) => s.getTotalMonthlyPayment);
  const budgets = useBudgetStore((s) => s.budgets);
  const payments = useDebtStore((s) => s.payments);
  const debts = useDebtStore((s) => s.debts);
  const cards = useCreditCardStore((s) => s.cards);
  const goals = useSavingsStore((s) => s.goals);

  const now = useMemo(() => new Date(), []);

  // Mes seleccionado (estado). Inicia en el mes actual; el selector permite
  // revisar meses pasados. Solo afecta las métricas MENSUALES; patrimonio,
  // tarjetas, salud y recordatorios siguen siendo de hoy.
  const [sel, setSel] = useState(() => ({ y: now.getFullYear(), m: now.getMonth() }));
  const y = sel.y;
  const m = sel.m;
  const isCurrentMonth = sel.y === now.getFullYear() && sel.m === now.getMonth();

  const monthTx = useMemo(
    () => transactions.filter((t) => {
      const d = new Date(t.date + 'T00:00:00');
      return d.getFullYear() === y && d.getMonth() === m;
    }),
    [transactions, y, m],
  );

  const monthBudgets = useMemo(() => budgets.filter((b) => b.year === y && b.month === m), [budgets, y, m]);

  const debtPaidThisMonth = useMemo(() => payments.reduce((sum, p) => {
    const d = new Date(p.date + 'T00:00:00');
    if (d.getFullYear() !== y || d.getMonth() !== m) return sum;
    return sum + (Number(p.amount) || 0);
  }, 0), [payments, y, m]);

  const summary = useMemo(() => getBudgetSummary({
    monthTransactions: monthTx, monthBudgets, categories,
    debtPlanned: getTotalMonthlyPayment(), debtPaid: debtPaidThisMonth,
  }), [monthTx, monthBudgets, categories, getTotalMonthlyPayment, debtPaidThisMonth]);

  // Donut de gastos
  const breakdown = useMemo(() => getCategoryBreakdown(monthTx, categories), [monthTx, categories]);

  // Efectivo líquido (solo demo): saldo derivado para el modal "Apartar a ahorro".
  // Los gastos con tarjeta NO restan del efectivo; los pagos de tarjeta sí.
  const demo = isDemoActive();
  const initialCashBalance = usePrefsStore((s) => s.initialCashBalance);

  // Rango del gráfico de tendencia: 3 meses / 1 año / todo el tiempo. Siempre
  // termina en el mes actual (now) y arranca a lo sumo en la primera transacción.
  const [wealthRange, setWealthRange] = useState(3);
  const wealthSeries = useMemo(
    () => getCumulativeLiquidWealth(transactions, initialCashBalance, wealthRange, now, cards),
    [transactions, initialCashBalance, wealthRange, now, cards],
  );
  const rangeOptions = [
    { value: '3', label: t('dashboard.range3') },
    { value: '12', label: t('dashboard.range12') },
    { value: 'all', label: t('dashboard.rangeAll') },
  ];

  // Presupuesto usado + ritmo del mes en curso (tick y veredicto de BudgetBar)
  const budgetUsage = useMemo(() => getBudgetUsage(summary), [summary]);
  const budgetPace = useMemo(() => getBudgetPace(budgetUsage, {
    isCurrentMonth,
    dayOfMonth: now.getDate(),
    daysInMonth: new Date(y, m + 1, 0).getDate(),
  }), [budgetUsage, isCurrentMonth, now, y, m]);

  // Salud (reusa utils probadas). includeCurrent=true: cuenta el mes en curso +
  // los anteriores, para que reaccione en vivo a lo registrado hoy sin mentir
  // (un mes parcial pesa como un mes más en el promedio, no lo dispara).
  const cap = useMemo(() => getMonthlySavingCapacity(transactions, now, 3, true), [transactions, now]);
  const health = useMemo(() => getFinancialHealthScore({ avgIncome: cap.avgIncome, avgExpense: cap.avgExpense, monthlyDebt: getTotalMonthlyPayment() }), [cap, getTotalMonthlyPayment]);
  const healthHasData = cap.avgIncome > 0;

  // Recordatorios (siempre de HOY, no del mes seleccionado).
  const signals = useMemo(() => {
    const out = [];
    const todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    cards.forEach((card) => {
      const bal = getCardBalances(card, transactions, now);
      if (bal.isPaid || bal.pendingBilled <= 0) return;
      const due = new Date(bal.cycles.dueDateISO + 'T00:00:00');
      const days = Math.round((due - todayMid) / 86400000);
      if (days < 0 || days > 14) return;
      out.push({ tag: t('dashboard.cardToPay'), tc: days <= 2 ? 'text-accent-error' : 'text-accent-warning', t: days === 0 ? t('calendar.today').toUpperCase() : t('dashboard.inDays').replace('{d}', days), body: `${card.name}: ${fmt(bal.pendingBilled)} ${t('dashboard.dueOn')} ${formatDate(bal.cycles.dueDateISO)}.`, to: '/tarjetas' });
    });
    debts.filter((d) => d.status === 'active' && d.due_date).forEach((d) => {
      const due = new Date(String(d.due_date).slice(0, 10) + 'T00:00:00');
      const days = Math.round((due - todayMid) / 86400000);
      if (days < 0 || days > 14) return;
      out.push({ tag: t('dashboard.debtInstallment'), tc: 'text-accent-error', t: days === 0 ? t('calendar.today').toUpperCase() : t('dashboard.inDays').replace('{d}', days), body: `${d.creditorName}: ${fmt(Number(d.monthlyPayment))}.`, to: '/deudas' });
    });
    goals.filter((g) => g.status !== 'completed' && g.deadline).forEach((g) => {
      const due = new Date(g.deadline + 'T00:00:00');
      const days = Math.ceil((due - todayMid) / 86400000);
      if (days < 0 || days > 30) return;
      out.push({ tag: t('dashboard.goalUpcoming'), tc: 'text-secondary', t: t('dashboard.inDays').replace('{d}', days), body: `"${g.title}" ${t('dashboard.dueOn')} ${formatDate(g.deadline)}.`, to: '/ahorros' });
    });
    return out.sort((a) => (a.tc === 'text-accent-error' ? -1 : 1)).slice(0, 6);
  }, [cards, debts, goals, transactions, now, t]);

  return (
    <div className="p-sm sm:p-md max-w-[1728px] mx-auto w-full">
      {/* Título de página para lectores de pantalla (el bento no tiene header visible). */}
      <h1 className="sr-only">{t('nav.dashboard')}</h1>

      {/* Aviso (solo demo): efectivo inicial sin declarar. */}
      {demo && initialCashBalance === 0 && (
        <div className="flex items-center gap-sm mb-md px-md py-sm rounded bg-primary/10 border border-primary/30">
          <MS name="info" className="!text-[16px] text-primary" />
          <span className="font-label-sm text-label-sm text-on-surface-variant">{t('dashboard.declareInitialCash')}</span>
          <button onClick={() => navigate('/ajustes')} className="ml-auto font-mono-data text-mono-data text-primary hover:underline">{t('nav.settings')}</button>
        </div>
      )}

      <Stagger data-tour="dashboard-grid" className="grid grid-cols-2 md:grid-cols-12 gap-sm auto-rows-min">
        {/* 1 · Flujo del mes (HERO, col-7) + Donut (col-5) lado a lado. El gráfico
            unifica patrimonio, tasa de ahorro y tarjetas por pagar en su header. */}
        <Stagger.Item className="col-span-2 md:col-span-7">
          <BentoCell className="h-full">
            <div className="flex justify-between items-center border-b border-border-subtle pb-sm mb-sm gap-sm">
              <span className="font-mono-data text-mono-data text-on-surface-variant uppercase flex items-center gap-xs min-w-0">
                <MS name="show_chart" className="!text-[14px] text-text-muted shrink-0" />
                <span className="truncate">{t('dashboard.monthFlow')}</span>
                <span className="text-primary shrink-0">· {monthShort(m)} {y}</span>
              </span>
              <div className="w-[130px] shrink-0">
                <StitchSelect value={String(wealthRange)} onChange={(v) => setWealthRange(v === 'all' ? 'all' : Number(v))} options={rangeOptions} compact />
              </div>
            </div>
            <BudgetBar usage={budgetUsage} pace={budgetPace} />
            <div className="mt-md" />
            <WealthTrendChart
              data={wealthSeries}
              activeKey={`${y}-${m}`}
              onBarClick={(d) => setSel({ y: d.y, m: d.m })}
            />
          </BentoCell>
        </Stagger.Item>

        {/* Donut de gastos AL LADO del flujo (col-5). */}
        <Stagger.Item className="col-span-2 md:col-span-5">
          <BentoCell title={t('dashboard.expenses') + ' ' + t('pages.analysis')} icon="donut_small" className="h-full">
            <CategoryDonut data={breakdown} compact />
          </BentoCell>
        </Stagger.Item>

        {/* 3 · Salud financiera (col-7, compacta horizontal) + Recordatorios (col-5). */}
        <Stagger.Item className="col-span-2 md:col-span-7">
          <BentoCell title={`${t('dashboard.financialHealth')} · ${t('calendar.today')}`} icon="favorite" className="h-full">
            <HealthRing health={health} hasData={healthHasData} monthsCounted={cap.monthsCounted} compact />
          </BentoCell>
        </Stagger.Item>

        <Stagger.Item className="col-span-2 md:col-span-5">
          <BentoCell title={t('dashboard.monthReminder')} icon="radar" className="h-full">
            <SignalsRail signals={signals} onNavigate={navigate} />
          </BentoCell>
        </Stagger.Item>
      </Stagger>
    </div>
  );
}
