// Resumen (Dashboard) — bento grid ordenado por importancia. Datos reales; la
// lógica pura vive en dashboard/selectors.js y utils/calculations. Solo lectura.
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MS from '../MS';
import { Stagger } from '../StitchMotion';
import StitchSelect from '../StitchSelect';
import CountUp from '../CountUp';
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
import { formatCurrency, formatCurrencyCompact, formatDate } from '../../utils/formatters';
import { monthShort } from '../../i18n/runtime';
import { getCategoryBreakdown, getBudgetUsage, getBudgetPace, getNetWorthSplit } from './dashboard/selectors';
import { BentoCell, Stat, InfoTip } from './dashboard/dashboardUi';
import FlowChart from './dashboard/FlowChart';
import CategoryDonut from './dashboard/CategoryDonut';
import BudgetBar from './dashboard/BudgetBar';
import NetWorthBar from './dashboard/NetWorthBar';
import HealthRing from './dashboard/HealthRing';
import SignalsRail from './dashboard/SignalsRail';

const fmt = (n) => formatCurrency(n);
// Compacto para móvil, sin prefijo de moneda: "170.0K".
const fmtMob = (n) => formatCurrencyCompact(n).replace('RD$', '').trim();

export default function StitchDashboard() {
  const { t, language } = useI18n();
  const navigate = useNavigate();
  const transactions = useTransactionStore((s) => s.transactions);
  const categories = useCategoryStore((s) => s.categories);
  const getTotalSaved = useSavingsStore((s) => s.getTotalSaved);
  const getTotalDebt = useDebtStore((s) => s.getTotalDebt);
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

  // Opciones del selector: últimos 12 meses terminando en el mes actual.
  const monthOptions = useMemo(() => {
    const opts = [];
    for (let i = 0; i < 12; i++) {
      let mm = now.getMonth() - i, yy = now.getFullYear();
      while (mm < 0) { mm += 12; yy -= 1; }
      opts.push({ value: `${yy}-${mm}`, label: `${monthShort(mm)} ${yy}` });
    }
    return opts;
  }, [now, language]);

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
      arr.push({ label: monthShort(mm), y: yy, m: mm, inc, exp, net: inc - exp });
    }
    return arr;
  }, [transactions, y, m, language]);

  // Donut de gastos
  const breakdown = useMemo(() => getCategoryBreakdown(monthTx, categories), [monthTx, categories]);

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

  // `live: true` = métrica de HOY (no cambia con el mes seleccionado).
  // Patrimonio neto NO va aquí: tiene su propia celda abajo (evita redundancia).
  const metrics = [
    { l: t('dashboard.canSpend').toUpperCase(), v: <CountUp value={summary.puedesGastar} format={fmt} />, d: summary.estado === 'danger' ? t('dashboard.tooMuchSpent') : summary.estado === 'warning' ? t('dashboard.justRight') : t('dashboard.leftover'), c: summary.estado === 'danger' ? 'text-accent-error' : summary.estado === 'warning' ? 'text-accent-warning' : 'text-tertiary', info: t('dashboard.incomeMinusExpenses') },
    { l: t('dashboard.creditCardsPayable').toUpperCase(), v: <CountUp value={totalPendingCards} format={fmt} />, d: totalPendingCards > 0 ? t('dashboard.pending') : t('dashboard.upToDate'), warn: totalPendingCards > 0, c: totalPendingCards > 0 ? 'text-accent-warning' : 'text-tertiary', info: t('dashboard.cardStatus'), live: true },
    { l: t('dashboard.savingsRate').toUpperCase(), v: <CountUp value={savingsRate} format={(n) => `${n.toFixed(1)}%`} />, d: t('dashboard.ofIncome'), c: savingsRate >= 20 ? 'text-tertiary' : 'text-on-surface-variant', info: t('dashboard.savingsFormula') },
  ];

  return (
    <div className="p-md sm:p-margin-safe max-w-[1728px] mx-auto w-full">
      {/* Título de página para lectores de pantalla (el bento no tiene header visible). */}
      <h1 className="sr-only">{t('nav.dashboard')}</h1>
      {/* Banner: solo cuando se revisa un mes pasado. Aclara qué refleja el pasado. */}
      {!isCurrentMonth && (
        <div className="flex items-center gap-sm mb-md px-md py-sm rounded bg-secondary/10 border border-secondary/30">
          <MS name="history" className="!text-[16px] text-secondary" />
          <span className="font-mono-data text-mono-data text-secondary uppercase">{t('dashboard.viewing')} {monthShort(m)} {y}</span>
          <span className="font-mono-data text-mono-data text-text-muted normal-case tracking-normal">{t('dashboard.pastMonthNote')}</span>
          <button onClick={() => setSel({ y: now.getFullYear(), m: now.getMonth() })} className="ml-auto font-mono-data text-mono-data text-primary hover:underline">{t('dashboard.backToToday')}</button>
        </div>
      )}

      <Stagger data-tour="dashboard-grid" className="grid grid-cols-1 md:grid-cols-12 gap-md auto-rows-min">
        {/* 1 · Estado inmediato: 3 KPI accionables (patrimonio tiene su celda abajo) */}
        {metrics.map((mx) => (
          <Stagger.Item key={mx.l} className="md:col-span-4">
            <div className="glass-card rounded-lg inner-glow p-md flex flex-col gap-sm h-full">
              <div className="font-mono-data text-mono-data text-text-muted border-b border-border-subtle pb-xs flex items-center justify-between gap-xs">
                <span className="flex items-center gap-xs">{mx.l}{mx.live && !isCurrentMonth && <span className="text-[8px] text-secondary border border-secondary/40 rounded px-1">{t('calendar.today').toUpperCase()}</span>}</span>
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
              <span className="font-mono-data text-mono-data text-on-surface-variant uppercase flex items-center gap-xs"><MS name="show_chart" className="!text-[14px] text-text-muted" /> {t('dashboard.monthFlow')}</span>
              <div className="w-[150px]">
                <StitchSelect value={`${sel.y}-${sel.m}`} onChange={(v) => { const [yy, mm] = v.split('-').map(Number); setSel({ y: yy, m: mm }); }} options={monthOptions} compact />
              </div>
            </div>
            {/* En móvil el monto completo no cabe en 3 columnas y se truncaba
                ("+RD$ 170,…"); ahí se usa formato compacto sin prefijo (+170.0K),
                como el mockup de la landing: la moneda ya es contexto. */}
            <div className="grid grid-cols-3 gap-sm mb-md">
              <Stat label={t('dashboard.income')} value={<CountUp value={totals.income} format={(n) => `+${fmt(n)}`} />} mobileValue={`+${fmtMob(totals.income)}`} cls="text-tertiary" />
              <Stat label={t('dashboard.expenses')} value={<CountUp value={totals.expense} format={(n) => `−${fmt(n)}`} />} mobileValue={`−${fmtMob(totals.expense)}`} cls="text-accent-error" />
              <Stat label={t('dashboard.balance')} value={<CountUp value={totals.balance} format={(n) => `${n >= 0 ? '+' : '−'}${fmt(Math.abs(n))}`} />} mobileValue={`${totals.balance >= 0 ? '+' : '−'}${fmtMob(Math.abs(totals.balance))}`} cls={totals.balance >= 0 ? 'text-on-surface' : 'text-accent-error'} />
            </div>
            <BudgetBar usage={budgetUsage} pace={budgetPace} />
            <FlowChart series={series} selY={sel.y} selM={sel.m} />
          </BentoCell>
        </Stagger.Item>

        {/* 3 · Columna derecha del hero: Salud + Patrimonio apiladas (compactas,
            estado de hoy). Juntas llenan el alto del hero sin espacio vacío. */}
        <Stagger.Item className="md:col-span-4 flex flex-col gap-md">
          <BentoCell title={`${t('dashboard.financialHealth')} · ${t('calendar.today')}`} icon="favorite" className="flex-grow">
            <HealthRing health={health} hasData={healthHasData} monthsCounted={cap.monthsCounted} />
          </BentoCell>
          <BentoCell title={`${t('dashboard.netWorth')} · ${t('calendar.today')}`} icon="account_balance" className="flex-grow">
            <NetWorthBar split={split} />
          </BentoCell>
        </Stagger.Item>

        {/* 4 · ¿En qué gasto? + ¿Qué viene? Comparten fila en pantallas anchas
            (donut 8 / recordatorios 4) para que el dashboard quepa sin scroll;
            en md (tablet) se apilan porque la leyenda del donut necesita ancho. */}
        <Stagger.Item className="md:col-span-12 lg:col-span-8">
          <BentoCell title={t('dashboard.expenses') + ' ' + t('pages.analysis')} icon="donut_small" className="h-full">
            <CategoryDonut data={breakdown} />
          </BentoCell>
        </Stagger.Item>

        <Stagger.Item className="md:col-span-12 lg:col-span-4">
          <BentoCell title={t('dashboard.monthReminder')} icon="radar" className="h-full">
            <SignalsRail signals={signals} onNavigate={navigate} />
          </BentoCell>
        </Stagger.Item>
      </Stagger>
    </div>
  );
}
