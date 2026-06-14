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
import { formatCurrency, formatAmountCompact, formatDate } from '../../utils/formatters';
import { monthShort } from '../../i18n/runtime';
import { getCategoryBreakdown, getBudgetUsage, getBudgetPace, getLiquidCash, getLiquidDelta, getCumulativeLiquidWealth } from './dashboard/selectors';
import { BentoCell, Stat, InfoTip } from './dashboard/dashboardUi';
import WealthTrendChart from './dashboard/WealthTrendChart';
import CategoryDonut from './dashboard/CategoryDonut';
import BudgetBar from './dashboard/BudgetBar';
import HealthRing from './dashboard/HealthRing';
import SignalsRail from './dashboard/SignalsRail';
import SaveToVaultModal from './dashboard/SaveToVaultModal';
import usePrefsStore from '../../stores/usePrefsStore';
import { isDemoActive } from '../demoMode';

const fmt = (n) => formatCurrency(n);
// Compacto para móvil, sin prefijo de moneda: "170.0K".
const fmtMob = (n) => formatAmountCompact(n);

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

  const totalPendingCards = useMemo(() => cards.reduce(
    (sum, c) => sum + (getCardBalances(c, transactions, now).pendingBilled || 0), 0,
  ), [cards, transactions, now]);

  // Donut de gastos
  const breakdown = useMemo(() => getCategoryBreakdown(monthTx, categories), [monthTx, categories]);

  // Efectivo líquido (solo demo): saldo derivado + delta del mes. Los gastos con
  // tarjeta NO restan del efectivo; los pagos de tarjeta (card.payments) sí.
  const demo = isDemoActive();
  const initialCashBalance = usePrefsStore((s) => s.initialCashBalance);
  const liquidCash = useMemo(() => getLiquidCash(transactions, initialCashBalance, cards), [transactions, initialCashBalance, cards]);
  const liquidDelta = useMemo(() => getLiquidDelta(monthTx, cards, y, m), [monthTx, cards, y, m]);
  const [saveOpen, setSaveOpen] = useState(false);

  // Rango del gráfico de tendencia: 3 meses / 1 año / todo el tiempo. Siempre
  // termina en el mes actual (now) y arranca a lo sumo en la primera transacción.
  const [wealthRange, setWealthRange] = useState(3);
  const wealthSeries = useMemo(
    () => getCumulativeLiquidWealth(transactions, initialCashBalance, wealthRange, now),
    [transactions, initialCashBalance, wealthRange, now],
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

  // `live: true` = métrica de HOY (no cambia con el mes seleccionado).
  const metrics = [
    { l: t('dashboard.creditCardsPayable').toUpperCase(), v: <CountUp value={totalPendingCards} format={fmt} />, mv: fmtMob(totalPendingCards), d: totalPendingCards > 0 ? t('dashboard.pending') : t('dashboard.upToDate'), warn: totalPendingCards > 0, c: totalPendingCards > 0 ? 'text-accent-warning' : 'text-tertiary', info: t('dashboard.cardStatus'), live: true },
    { l: t('dashboard.savingsRate').toUpperCase(), v: <CountUp value={savingsRate} format={(n) => `${n.toFixed(1)}%`} />, mv: `${savingsRate.toFixed(0)}%`, d: t('dashboard.ofIncome'), c: savingsRate >= 20 ? 'text-tertiary' : 'text-on-surface-variant', info: t('dashboard.savingsFormula') },
  ];

  return (
    <div className="p-sm sm:p-md max-w-[1728px] mx-auto w-full">
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

      {/* Aviso (solo demo): efectivo inicial sin declarar. */}
      {demo && initialCashBalance === 0 && (
        <div className="flex items-center gap-sm mb-md px-md py-sm rounded bg-primary/10 border border-primary/30">
          <MS name="info" className="!text-[16px] text-primary" />
          <span className="font-label-sm text-label-sm text-on-surface-variant">{t('dashboard.declareInitialCash')}</span>
          <button onClick={() => navigate('/ajustes')} className="ml-auto font-mono-data text-mono-data text-primary hover:underline">{t('nav.settings')}</button>
        </div>
      )}

      <Stagger data-tour="dashboard-grid" className="grid grid-cols-2 md:grid-cols-12 gap-sm auto-rows-min">
        {/* 0 · Efectivo disponible (solo demo): la estrella — el líquido que arrastra. */}
        {demo && (
          <Stagger.Item className="col-span-2 md:col-span-4">
            <div className="glass-card rounded-lg inner-glow p-sm px-md flex flex-col gap-xs h-full">
              <div className="font-mono-data text-mono-data text-text-muted border-b border-border-subtle pb-xs flex items-center justify-between gap-xs">
                <span className="truncate">{t('dashboard.liquidCash').toUpperCase()}</span>
                <InfoTip text={t('dashboard.liquidCashInfo')} />
              </div>
              <div className="flex items-end justify-between gap-sm flex-wrap">
                <div>
                  <Stat value={<CountUp value={liquidCash} format={fmt} />} mobileValue={fmtMob(liquidCash)} cls={liquidCash >= 0 ? 'text-on-surface' : 'text-accent-error'} />
                  <span className={`font-mono-data text-mono-data ${liquidDelta >= 0 ? 'text-tertiary' : 'text-accent-error'}`}>
                    {liquidDelta >= 0 ? '+' : '−'}{fmt(Math.abs(liquidDelta))} {t('dashboard.thisMonth')}
                  </span>
                </div>
                <button
                  onClick={() => setSaveOpen(true)}
                  className="px-sm py-xs rounded bg-primary text-on-primary font-label-sm text-label-sm active:scale-[0.97] shrink-0"
                >
                  {t('dashboard.saveToVault')}
                </button>
              </div>
            </div>
          </Stagger.Item>
        )}

        {/* 1 · Estado inmediato: 3 KPI accionables, compactos (col-4 c/u). */}
        {metrics.map((mx) => (
          <Stagger.Item key={mx.l} className="col-span-1 md:col-span-4">
            <div className="glass-card rounded-lg inner-glow p-sm px-md flex flex-col gap-xs h-full">
              <div className="font-mono-data text-mono-data text-text-muted border-b border-border-subtle pb-xs flex items-center justify-between gap-xs">
                <span className="flex items-center gap-xs min-w-0"><span className="truncate">{mx.l}</span>{mx.live && !isCurrentMonth && <span className="text-[8px] text-secondary border border-secondary/40 rounded px-1 shrink-0">{t('calendar.today').toUpperCase()}</span>}</span>
                <InfoTip text={mx.info} />
              </div>
              <Stat value={mx.v} mobileValue={mx.mv} cls={mx.c} sub={mx.d} warn={mx.warn} />
            </div>
          </Stagger.Item>
        ))}

        {/* 2 · Flujo del mes (HERO, col-7) + Donut (col-5) lado a lado. */}
        <Stagger.Item className="col-span-2 md:col-span-7">
          <BentoCell className="h-full">
            <div className="flex justify-between items-center border-b border-border-subtle pb-sm mb-sm gap-sm">
              <span className="font-mono-data text-mono-data text-on-surface-variant uppercase flex items-center gap-xs min-w-0">
                <MS name="show_chart" className="!text-[14px] text-text-muted shrink-0" />
                <span className="truncate">{t('dashboard.monthFlow')}</span>
                {/* Mes activo (lo fija el clic en una barra del gráfico). */}
                <span className="text-primary shrink-0">· {monthShort(m)} {y}</span>
              </span>
              <div className="w-[140px] shrink-0">
                <StitchSelect value={String(wealthRange)} onChange={(v) => setWealthRange(v === 'all' ? 'all' : Number(v))} options={rangeOptions} compact />
              </div>
            </div>
            {/* En móvil el monto completo no cabe en 3 columnas y se truncaba
                ("+RD$ 170,…"); ahí se usa formato compacto sin prefijo (+170.0K),
                como el mockup de la landing: la moneda ya es contexto. */}
            <div className="grid grid-cols-3 gap-sm mb-sm">
              <Stat label={t('dashboard.income')} value={<CountUp value={totals.income} format={(n) => `+${fmt(n)}`} />} mobileValue={`+${fmtMob(totals.income)}`} cls="text-tertiary" />
              <Stat label={t('dashboard.expenses')} value={<CountUp value={totals.expense} format={(n) => `−${fmt(n)}`} />} mobileValue={`−${fmtMob(totals.expense)}`} cls="text-accent-error" />
              <Stat label={t('dashboard.balance')} value={<CountUp value={totals.balance} format={(n) => `${n >= 0 ? '+' : '−'}${fmt(Math.abs(n))}`} />} mobileValue={`${totals.balance >= 0 ? '+' : '−'}${fmtMob(Math.abs(totals.balance))}`} cls={totals.balance >= 0 ? 'text-on-surface' : 'text-accent-error'} />
            </div>
            <BudgetBar usage={budgetUsage} pace={budgetPace} />
            <div className="mt-sm" />
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

      {demo && (
        <SaveToVaultModal
          open={saveOpen}
          onClose={() => setSaveOpen(false)}
          goals={goals}
          availableCash={liquidCash}
        />
      )}
    </div>
  );
}
