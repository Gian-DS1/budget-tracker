// Resumen (Dashboard) — bento grid ordenado por importancia. Datos reales; la
// lógica pura vive en dashboard/selectors.js y utils/calculations. Solo lectura.
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stagger } from '../StitchMotion';
import useTransactionStore from '../../stores/useTransactionStore';
import useSavingsStore from '../../stores/useSavingsStore';
import useDebtStore from '../../stores/useDebtStore';
import useCategoryStore from '../../stores/useCategoryStore';
import useBudgetStore from '../../stores/useBudgetStore';
import useCreditCardStore from '../../stores/useCreditCardStore';
import useRateStore from '../../stores/useRateStore';
import {
  getBudgetSummary, getMonthlySavingCapacity, getFinancialHealthScore,
} from '../../utils/calculations';
import { getCardBalances } from '../../utils/creditCards';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { MONTHS_SHORT_ES } from '../../utils/constants';
import { getCategoryBreakdown, getBudgetUsage, getNetWorthSplit } from './dashboard/selectors';
import { BentoCell, Stat } from './dashboard/dashboardUi';
import FlowChart from './dashboard/FlowChart';
import CategoryDonut from './dashboard/CategoryDonut';
import BudgetBar from './dashboard/BudgetBar';
import NetWorthBar from './dashboard/NetWorthBar';
import HealthRing from './dashboard/HealthRing';
import SignalsRail from './dashboard/SignalsRail';

const fmt = (n) => formatCurrency(n);

export default function StitchDashboard() {
  const navigate = useNavigate();
  const { transactions } = useTransactionStore();
  const { categories } = useCategoryStore();
  const { getTotalSaved } = useSavingsStore();
  const { getTotalDebt, getTotalMonthlyPayment } = useDebtStore();
  const budgets = useBudgetStore((s) => s.budgets);
  const payments = useDebtStore((s) => s.payments);
  const debts = useDebtStore((s) => s.debts);
  const cards = useCreditCardStore((s) => s.cards);
  const goals = useSavingsStore((s) => s.goals);
  const fxRate = useRateStore((s) => s.getRate());

  const now = useMemo(() => new Date(), []);
  const y = now.getFullYear();
  const m = now.getMonth();

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
    const debt = debts.find((dd) => dd.id === p.debtId);
    const val = Number(p.amount) || 0;
    return sum + (debt && debt.currency === 'USD' ? val * fxRate : val);
  }, 0), [payments, debts, y, m, fxRate]);

  const summary = useMemo(() => getBudgetSummary({
    monthTransactions: monthTx, monthBudgets, categories,
    debtPlanned: getTotalMonthlyPayment(), debtPaid: debtPaidThisMonth,
  }), [monthTx, monthBudgets, categories, getTotalMonthlyPayment, debtPaidThisMonth]);

  // Flujo del mes
  const totals = useMemo(() => {
    let income = 0, expense = 0;
    monthTx.forEach((t) => {
      if (t.type === 'income') income += Number(t.amount);
      else if (['expense', 'fixed_expense', 'variable_expense'].includes(t.type))
        expense += Number(t.amount) - Number(t.cashbackEarned || 0);
    });
    return { income, expense, balance: income - expense };
  }, [monthTx]);
  const savingsRate = totals.income > 0 ? ((totals.income - totals.expense) / totals.income) * 100 : 0;

  // Patrimonio
  const totalSaved = getTotalSaved();
  const totalDebt = getTotalDebt();
  const netWorth = totalSaved - totalDebt;
  const split = useMemo(() => getNetWorthSplit(totalSaved, totalDebt), [totalSaved, totalDebt]);

  const totalPendingCards = useMemo(() => cards.reduce(
    (sum, c) => sum + (getCardBalances(c, transactions, now).pendingBilled || 0), 0,
  ), [cards, transactions, now]);

  // Serie 6 meses (inc/exp/net) para FlowChart
  const series = useMemo(() => {
    const arr = [];
    for (let i = 5; i >= 0; i--) {
      let mm = m - i, yy = y;
      while (mm < 0) { mm += 12; yy -= 1; }
      let inc = 0, exp = 0;
      transactions.forEach((t) => {
        const d = new Date(t.date + 'T00:00:00');
        if (d.getFullYear() !== yy || d.getMonth() !== mm) return;
        if (t.type === 'income') inc += Number(t.amount);
        else if (['expense', 'fixed_expense', 'variable_expense'].includes(t.type)) exp += Number(t.amount) - Number(t.cashbackEarned || 0);
      });
      arr.push({ label: MONTHS_SHORT_ES[mm], inc, exp, net: inc - exp });
    }
    return arr;
  }, [transactions, y, m]);

  // Donut de gastos
  const breakdown = useMemo(() => getCategoryBreakdown(monthTx, categories), [monthTx, categories]);

  // Presupuesto usado
  const budgetUsage = useMemo(() => getBudgetUsage(summary), [summary]);

  // Salud (reusa utils probadas)
  const cap = useMemo(() => getMonthlySavingCapacity(transactions, now, 3), [transactions, now]);
  const health = useMemo(() => getFinancialHealthScore({ avgIncome: cap.avgIncome, avgExpense: cap.avgExpense, monthlyDebt: getTotalMonthlyPayment() }), [cap, getTotalMonthlyPayment]);
  const healthHasData = cap.avgIncome > 0;

  // Recordatorios
  const signals = useMemo(() => {
    const out = [];
    const todayMid = new Date(y, m, now.getDate());
    cards.forEach((card) => {
      const bal = getCardBalances(card, transactions, now);
      if (bal.isPaid || bal.pendingBilled <= 0) return;
      const due = new Date(bal.cycles.dueDateISO + 'T00:00:00');
      const days = Math.round((due - todayMid) / 86400000);
      if (days < 0 || days > 14) return;
      out.push({ tag: 'Tarjeta por pagar', tc: days <= 2 ? 'text-accent-error' : 'text-accent-warning', t: days === 0 ? 'HOY' : `EN ${days}D`, body: `${card.name}: ${fmt(bal.pendingBilled)} vence ${formatDate(bal.cycles.dueDateISO)}.`, to: '/tarjetas' });
    });
    debts.filter((d) => d.status === 'active' && d.due_date).forEach((d) => {
      const due = new Date(String(d.due_date).slice(0, 10) + 'T00:00:00');
      const days = Math.round((due - todayMid) / 86400000);
      if (days < 0 || days > 14) return;
      out.push({ tag: 'Cuota de deuda', tc: 'text-accent-error', t: days === 0 ? 'HOY' : `EN ${days}D`, body: `${d.creditorName}: ${fmt(Number(d.monthlyPayment) * (d.currency === 'USD' ? fxRate : 1))}.`, to: '/deudas' });
    });
    goals.filter((g) => g.status !== 'completed' && g.deadline).forEach((g) => {
      const due = new Date(g.deadline + 'T00:00:00');
      const days = Math.ceil((due - todayMid) / 86400000);
      if (days < 0 || days > 30) return;
      out.push({ tag: 'Meta próxima', tc: 'text-secondary', t: `EN ${days}D`, body: `"${g.title}" vence ${formatDate(g.deadline)}.`, to: '/ahorros' });
    });
    return out.sort((a) => (a.tc === 'text-accent-error' ? -1 : 1)).slice(0, 6);
  }, [cards, debts, goals, transactions, fxRate, y, m, now]);

  const metrics = [
    { l: 'PUEDES GASTAR', v: fmt(summary.puedesGastar), d: summary.estado === 'danger' ? 'Sin margen' : summary.estado === 'warning' ? 'Ajustado' : 'Con margen', c: summary.estado === 'danger' ? 'text-accent-error' : summary.estado === 'warning' ? 'text-accent-warning' : 'text-tertiary' },
    { l: 'TARJETAS POR PAGAR', v: fmt(totalPendingCards), d: totalPendingCards > 0 ? 'Pendiente' : 'Al día', warn: totalPendingCards > 0, c: totalPendingCards > 0 ? 'text-accent-warning' : 'text-tertiary' },
    { l: 'TASA DE AHORRO', v: `${savingsRate.toFixed(1)}%`, d: 'del ingreso', c: savingsRate >= 20 ? 'text-tertiary' : 'text-on-surface-variant' },
    { l: 'PATRIMONIO NETO', v: fmt(netWorth), d: `Ahorro ${fmt(totalSaved)}`, c: netWorth >= 0 ? 'text-tertiary' : 'text-accent-error' },
  ];

  return (
    <div className="p-md sm:p-margin-safe max-w-[1728px] mx-auto w-full">
      <Stagger className="grid grid-cols-1 md:grid-cols-12 gap-md auto-rows-min">
        {/* 1 · Estado inmediato: 4 KPI */}
        {metrics.map((mx) => (
          <Stagger.Item key={mx.l} className="md:col-span-3">
            <div className="glass-card rounded-lg inner-glow p-md flex flex-col gap-sm h-full">
              <div className="font-mono-data text-mono-data text-text-muted border-b border-border-subtle pb-xs">{mx.l}</div>
              <Stat value={mx.v} cls={mx.c} sub={mx.d} warn={mx.warn} />
            </div>
          </Stagger.Item>
        ))}

        {/* 2 · ¿Voy bien este mes? Presupuesto + flujo (hero) */}
        <Stagger.Item className="md:col-span-8">
          <BentoCell title={`Flujo de ${MONTHS_SHORT_ES[m]} ${y}`} icon="show_chart" className="h-full">
            <div className="grid grid-cols-3 gap-sm mb-md">
              <Stat label="Ingresos" value={`+${fmt(totals.income)}`} cls="text-tertiary" />
              <Stat label="Gastos" value={`−${fmt(totals.expense)}`} cls="text-accent-error" />
              <Stat label="Balance" value={`${totals.balance >= 0 ? '+' : '−'}${fmt(Math.abs(totals.balance))}`} cls={totals.balance >= 0 ? 'text-on-surface' : 'text-accent-error'} />
            </div>
            <BudgetBar usage={budgetUsage} />
            <FlowChart series={series} />
          </BentoCell>
        </Stagger.Item>

        {/* 3 · Salud */}
        <Stagger.Item className="md:col-span-4">
          <BentoCell title="Salud financiera" icon="favorite" className="h-full">
            <HealthRing health={health} hasData={healthHasData} />
          </BentoCell>
        </Stagger.Item>

        {/* 4 · ¿En qué gasto? */}
        <Stagger.Item className="md:col-span-5">
          <BentoCell title="Gastos por categoría" icon="donut_small" className="h-full">
            <CategoryDonut data={breakdown} />
          </BentoCell>
        </Stagger.Item>

        {/* 5 · Patrimonio */}
        <Stagger.Item className="md:col-span-7">
          <BentoCell title="Patrimonio" icon="account_balance" className="h-full">
            <NetWorthBar split={split} />
          </BentoCell>
        </Stagger.Item>

        {/* 6 · ¿Qué viene? Recordatorios */}
        <Stagger.Item className="md:col-span-12">
          <BentoCell title="Recordatorios" icon="radar">
            <SignalsRail signals={signals} onNavigate={navigate} />
          </BentoCell>
        </Stagger.Item>
      </Stagger>
    </div>
  );
}
