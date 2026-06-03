// Resumen (Dashboard) — layout Stitch "Command Center" con DATOS REALES.
// Cash Flow Engine = flujo del mes real; métricas = puedes-gastar/patrimonio/
// ahorro/deuda; Recent Signals = recordatorios reales (tarjetas, plan, readiness).

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import MS from '../MS';
import useTransactionStore from '../../stores/useTransactionStore';
import useSavingsStore from '../../stores/useSavingsStore';
import useDebtStore from '../../stores/useDebtStore';
import useCategoryStore from '../../stores/useCategoryStore';
import useBudgetStore from '../../stores/useBudgetStore';
import useCreditCardStore from '../../stores/useCreditCardStore';
import useRateStore from '../../stores/useRateStore';
import { getBudgetSummary } from '../../utils/calculations';
import { getCardBalances } from '../../utils/creditCards';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { MONTHS_SHORT_ES } from '../../utils/constants';

const fmt = (n) => formatCurrency(n).replace('RD$ ', 'RD$ ');

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
    [transactions, y, m]
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

  const totalPendingCards = useMemo(() => cards.reduce(
    (sum, c) => sum + (getCardBalances(c, transactions, now).pendingBilled || 0), 0
  ), [cards, transactions, now]);

  // Evolución 6 meses (para el área chart)
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
      arr.push({ label: MONTHS_SHORT_ES[mm], net: inc - exp, inc, exp });
    }
    return arr;
  }, [transactions, y, m]);

  // Polígono del área chart a partir de la serie de balance neto.
  const areaClip = useMemo(() => {
    const vals = series.map((s) => s.net);
    const max = Math.max(1, ...vals.map(Math.abs));
    const pts = series.map((s, i) => {
      const x = series.length > 1 ? (i / (series.length - 1)) * 100 : 0;
      const yPct = 50 - (s.net / max) * 40; // centro 50%, ±40%
      return `${x}% ${Math.max(2, Math.min(98, yPct))}%`;
    });
    return `polygon(${pts.join(',')},100% 100%,0 100%)`;
  }, [series]);

  // Recent Signals (recordatorios reales)
  const signals = useMemo(() => {
    const out = [];
    const todayMid = new Date(y, m, now.getDate());
    cards.forEach((card) => {
      const bal = getCardBalances(card, transactions, now);
      if (bal.isPaid || bal.pendingBilled <= 0) return;
      const due = new Date(bal.cycles.dueDateISO + 'T00:00:00');
      const days = Math.round((due - todayMid) / 86400000);
      if (days < 0 || days > 14) return;
      out.push({
        tag: 'Tarjeta por pagar', tc: days <= 2 ? 'text-accent-error' : 'text-accent-warning',
        t: days === 0 ? 'HOY' : `EN ${days}D`,
        body: `${card.name}: ${fmt(bal.pendingBilled)} vence ${formatDate(bal.cycles.dueDateISO)}.`,
        cta: 'VER', to: '/tarjetas',
      });
    });
    debts.filter((d) => d.status === 'active' && d.due_date).forEach((d) => {
      const due = new Date(String(d.due_date).slice(0, 10) + 'T00:00:00');
      const days = Math.round((due - todayMid) / 86400000);
      if (days < 0 || days > 14) return;
      out.push({
        tag: 'Cuota de deuda', tc: 'text-accent-error', t: days === 0 ? 'HOY' : `EN ${days}D`,
        body: `${d.creditorName}: ${fmt(Number(d.monthlyPayment) * (d.currency === 'USD' ? fxRate : 1))}.`,
        cta: 'VER', to: '/deudas',
      });
    });
    goals.filter((g) => g.status !== 'completed' && g.deadline).forEach((g) => {
      const due = new Date(g.deadline + 'T00:00:00');
      const days = Math.ceil((due - todayMid) / 86400000);
      if (days < 0 || days > 30) return;
      out.push({ tag: 'Meta próxima', tc: 'text-secondary', t: `EN ${days}D`, body: `"${g.title}" vence ${formatDate(g.deadline)}.`, cta: 'VER', to: '/ahorros' });
    });
    return out.sort((a) => (a.tc === 'text-accent-error' ? -1 : 1)).slice(0, 6);
  }, [cards, debts, goals, transactions, fxRate, y, m, now]);

  const empty = transactions.length === 0;

  const metrics = [
    { l: 'PUEDES GASTAR', v: fmt(summary.puedesGastar), d: summary.estado === 'danger' ? 'Sin margen' : summary.estado === 'warning' ? 'Ajustado' : 'Con margen', c: summary.estado === 'danger' ? 'text-accent-error' : summary.estado === 'warning' ? 'text-accent-warning' : 'text-tertiary' },
    { l: 'PATRIMONIO NETO', v: fmt(netWorth), d: `Ahorro ${fmt(totalSaved)}`, c: netWorth >= 0 ? 'text-tertiary' : 'text-accent-error' },
    { l: 'TASA DE AHORRO', v: `${savingsRate.toFixed(1)}%`, d: 'del ingreso', c: savingsRate >= 20 ? 'text-tertiary' : 'text-on-surface-variant' },
    { l: 'TARJETAS POR PAGAR', v: fmt(totalPendingCards), d: totalPendingCards > 0 ? 'Pendiente' : 'Al día', warn: totalPendingCards > 0, c: totalPendingCards > 0 ? 'text-accent-warning' : 'text-tertiary' },
  ];

  return (
    <div className="p-md sm:p-margin-safe flex flex-col xl:flex-row gap-gutter max-w-[1728px] mx-auto w-full">
      <div className="flex flex-col gap-gutter flex-grow min-w-0">
        {/* Hero: flujo del mes */}
        <section className="glass-card rounded-lg p-md sm:p-lg relative overflow-hidden flex flex-col min-h-[400px]">
          <div className="flex justify-between items-start mb-md z-10">
            <div>
              <h2 className="font-headline-md text-headline-md text-on-surface mb-xs">Flujo de {MONTHS_SHORT_ES[m]} {y}</h2>
              <p className="font-mono-data text-mono-data text-text-muted uppercase">Ingresos · gastos · balance neto</p>
            </div>
            <div className="flex items-center gap-sm">
              <span className="w-2 h-2 rounded-full bg-secondary status-glow-live" />
              <span className="font-mono-data text-mono-data text-secondary uppercase">En vivo</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-sm sm:gap-md z-10 mb-md">
            <Stat label="Ingresos" value={`+${fmt(totals.income)}`} cls="text-tertiary" />
            <Stat label="Gastos" value={`−${fmt(totals.expense)}`} cls="text-accent-error" />
            <Stat label="Balance" value={`${totals.balance >= 0 ? '+' : '−'}${fmt(Math.abs(totals.balance))}`} cls={totals.balance >= 0 ? 'text-on-surface' : 'text-accent-error'} sub={`Ahorro ${savingsRate.toFixed(1)}%`} />
          </div>

          {/* Área chart real (balance neto 6 meses) */}
          <div className="flex-grow relative chart-grid border-l border-b border-border-subtle mt-auto">
            {!empty && (
              <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(190,194,255,0.18) 0%, rgba(190,194,255,0) 100%)', clipPath: areaClip }} />
            )}
            <div className="absolute bottom-[-20px] left-0 right-0 flex justify-between font-mono-data text-[9px] text-text-muted px-1">
              {series.map((s, i) => <span key={i}>{s.label}</span>)}
            </div>
          </div>
        </section>

        {/* Métricas */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-sm">
          {metrics.map((mx) => (
            <div key={mx.l} className="glass-card rounded p-md flex flex-col gap-sm">
              <div className="font-mono-data text-mono-data text-text-muted border-b border-border-subtle pb-xs">{mx.l}</div>
              <div className="font-headline-md text-[22px] text-on-surface tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">{mx.v}</div>
              <div className={`font-label-sm text-label-sm flex items-center gap-xs ${mx.c}`}>
                {mx.warn && <MS name="warning" className="text-[14px]" />}
                {mx.d}
              </div>
            </div>
          ))}
        </section>
      </div>

      {/* Right rail: señales */}
      <aside className="w-full xl:w-[320px] shrink-0 glass-panel rounded-lg p-md flex flex-col border border-border-subtle">
        <div className="font-mono-data text-mono-data text-on-surface border-b border-border-subtle pb-sm mb-md flex justify-between items-center">
          <span>RECORDATORIOS</span>
          <MS name="radar" className="text-[14px] text-text-muted" />
        </div>
        <div className="flex flex-col gap-sm overflow-y-auto">
          {signals.length === 0 ? (
            <div className="text-center py-xl flex flex-col items-center gap-sm">
              <MS name="check_circle" className="text-[28px] text-tertiary" />
              <p className="font-body-md text-body-md text-text-muted">Sin pagos próximos.</p>
            </div>
          ) : signals.map((s, i) => (
            <div key={i} onClick={() => s.to && navigate(s.to)} className="group p-sm border border-transparent hover:border-border-subtle hover:bg-surface-container-high transition-all rounded flex flex-col gap-xs cursor-pointer">
              <div className="flex justify-between items-center">
                <span className={`font-label-sm text-label-sm ${s.tc}`}>{s.tag}</span>
                <span className="font-mono-data text-mono-data text-text-muted">{s.t}</span>
              </div>
              <div className="font-body-md text-body-md text-on-surface-variant group-hover:text-on-surface">{s.body}</div>
              {s.cta && <button className="mt-xs py-xs px-sm border border-border-subtle text-primary font-mono-data text-mono-data rounded self-start hover:bg-primary/10">{s.cta}</button>}
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

function Stat({ label, value, cls, sub }) {
  return (
    <div className="flex flex-col gap-xs">
      <span className="font-mono-data text-mono-data text-text-muted uppercase">{label}</span>
      <span className={`font-headline-md text-[20px] tracking-tight whitespace-nowrap ${cls}`}>{value}</span>
      {sub && <span className="font-label-sm text-label-sm text-text-muted">{sub}</span>}
    </div>
  );
}
