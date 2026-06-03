// Resumen (Dashboard) — bento grid ordenado por importancia. Datos reales; la
// lógica pura vive en dashboard/selectors.js y utils/calculations. Solo lectura.
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MS from '../MS';
import { Stagger } from '../StitchMotion';
import StitchSelect from '../StitchSelect';
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
import { BentoCell, Stat, InfoTip } from './dashboard/dashboardUi';
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

  // Mes seleccionado (estado). Inicia en el mes actual; el selector permite
  // revisar meses pasados. Solo afecta las métricas MENSUALES; patrimonio,
  // tarjetas, salud y recordatorios siguen siendo de hoy.
  const [sel, setSel] = useState(() => ({ y: now.getFullYear(), m: now.getMonth() }));
  const y = sel.y;
  const m = sel.m;
  const isCurrentMonth = sel.y === now.getFullYear() && sel.m === now.getMonth();

  // Opciones del selector: últimos 12 meses terminando en el mes actual.
  const monthOptions = useMemo(() => {
    const opts = [];
    for (let i = 0; i < 12; i++) {
      let mm = now.getMonth() - i, yy = now.getFullYear();
      while (mm < 0) { mm += 12; yy -= 1; }
      opts.push({ value: `${yy}-${mm}`, label: `${MONTHS_SHORT_ES[mm]} ${yy}` });
    }
    return opts;
  }, [now]);

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

  // Patrimonio (su celda lo muestra; getNetWorthSplit calcula el neto internamente)
  const totalSaved = getTotalSaved();
  const totalDebt = getTotalDebt();
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
  }, [cards, debts, goals, transactions, fxRate, now]);

  // `live: true` = métrica de HOY (no cambia con el mes seleccionado).
  // Patrimonio neto NO va aquí: tiene su propia celda abajo (evita redundancia).
  const metrics = [
    { l: 'PUEDES GASTAR', v: fmt(summary.puedesGastar), d: summary.estado === 'danger' ? 'Sin margen' : summary.estado === 'warning' ? 'Ajustado' : 'Con margen', c: summary.estado === 'danger' ? 'text-accent-error' : summary.estado === 'warning' ? 'text-accent-warning' : 'text-tertiary', info: 'Ingresos del mes menos gastos fijos y compromisos (deuda y ahorro planeados).' },
    { l: 'TARJETAS POR PAGAR', v: fmt(totalPendingCards), d: totalPendingCards > 0 ? 'Pendiente' : 'Al día', warn: totalPendingCards > 0, c: totalPendingCards > 0 ? 'text-accent-warning' : 'text-tertiary', info: 'Suma de los saldos facturados pendientes de todas tus tarjetas. Es un estado de hoy.', live: true },
    { l: 'TASA DE AHORRO', v: `${savingsRate.toFixed(1)}%`, d: 'del ingreso', c: savingsRate >= 20 ? 'text-tertiary' : 'text-on-surface-variant', info: '(Ingresos menos gastos) dividido entre los ingresos del mes.' },
  ];

  return (
    <div className="p-md sm:p-margin-safe max-w-[1728px] mx-auto w-full">
      {/* Banner: solo cuando se revisa un mes pasado. Aclara qué refleja el pasado. */}
      {!isCurrentMonth && (
        <div className="flex items-center gap-sm mb-md px-md py-sm rounded bg-secondary/10 border border-secondary/30">
          <MS name="history" className="!text-[16px] text-secondary" />
          <span className="font-mono-data text-mono-data text-secondary uppercase">Viendo: {MONTHS_SHORT_ES[m]} {y}</span>
          <span className="font-mono-data text-mono-data text-text-muted normal-case tracking-normal">— patrimonio, tarjetas, salud y recordatorios siguen siendo de hoy.</span>
          <button onClick={() => setSel({ y: now.getFullYear(), m: now.getMonth() })} className="ml-auto font-mono-data text-mono-data text-primary hover:underline">Volver a hoy</button>
        </div>
      )}

      <Stagger className="grid grid-cols-1 md:grid-cols-12 gap-md auto-rows-min">
        {/* 1 · Estado inmediato: 3 KPI accionables (patrimonio tiene su celda abajo) */}
        {metrics.map((mx) => (
          <Stagger.Item key={mx.l} className="md:col-span-4">
            <div className="glass-card rounded-lg inner-glow p-md flex flex-col gap-sm h-full">
              <div className="font-mono-data text-mono-data text-text-muted border-b border-border-subtle pb-xs flex items-center justify-between gap-xs">
                <span className="flex items-center gap-xs">{mx.l}{mx.live && !isCurrentMonth && <span className="text-[8px] text-secondary border border-secondary/40 rounded px-1">HOY</span>}</span>
                <InfoTip text={mx.info} />
              </div>
              <Stat value={mx.v} cls={mx.c} sub={mx.d} warn={mx.warn} />
            </div>
          </Stagger.Item>
        ))}

        {/* 2 · ¿Voy bien este mes? Presupuesto + flujo (HERO, dominante) */}
        <Stagger.Item className="md:col-span-8">
          <BentoCell className="h-full">
            <div className="flex justify-between items-center border-b border-border-subtle pb-sm mb-md gap-sm">
              <span className="font-mono-data text-mono-data text-on-surface-variant uppercase flex items-center gap-xs"><MS name="show_chart" className="!text-[14px] text-text-muted" /> Flujo del mes</span>
              <div className="w-[150px]">
                <StitchSelect value={`${sel.y}-${sel.m}`} onChange={(v) => { const [yy, mm] = v.split('-').map(Number); setSel({ y: yy, m: mm }); }} options={monthOptions} compact />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-sm mb-md">
              <Stat label="Ingresos" value={`+${fmt(totals.income)}`} cls="text-tertiary" />
              <Stat label="Gastos" value={`−${fmt(totals.expense)}`} cls="text-accent-error" />
              <Stat label="Balance" value={`${totals.balance >= 0 ? '+' : '−'}${fmt(Math.abs(totals.balance))}`} cls={totals.balance >= 0 ? 'text-on-surface' : 'text-accent-error'} />
            </div>
            <BudgetBar usage={budgetUsage} />
            <FlowChart series={series} />
          </BentoCell>
        </Stagger.Item>

        {/* 3 · Columna derecha del hero: Salud + Patrimonio apiladas (compactas,
            estado de hoy). Juntas llenan el alto del hero sin espacio vacío. */}
        <Stagger.Item className="md:col-span-4 flex flex-col gap-md">
          <BentoCell title="Salud financiera · hoy" icon="favorite" className="flex-grow">
            <HealthRing health={health} hasData={healthHasData} monthsCounted={cap.monthsCounted} />
          </BentoCell>
          <BentoCell title="Patrimonio · hoy" icon="account_balance" className="flex-grow">
            <NetWorthBar split={split} />
          </BentoCell>
        </Stagger.Item>

        {/* 4 · ¿En qué gasto? Donut a ancho completo */}
        <Stagger.Item className="md:col-span-12">
          <BentoCell title="Gastos por categoría" icon="donut_small" className="h-full">
            <CategoryDonut data={breakdown} />
          </BentoCell>
        </Stagger.Item>

        {/* 5 · ¿Qué viene? Recordatorios (de hoy) */}
        <Stagger.Item className="md:col-span-12">
          <BentoCell title="Recordatorios · hoy" icon="radar">
            <SignalsRail signals={signals} onNavigate={navigate} />
          </BentoCell>
        </Stagger.Item>
      </Stagger>
    </div>
  );
}
