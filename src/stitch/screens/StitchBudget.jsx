// Presupuesto base cero — layout bento Stitch con DATOS REALES.
// Header = mes + estado; Macro = puedes-gastar/comprometido; Burn = gasto diario;
// Envelope = sobres por categoría (estimado editable on-blur + gastado real).

import { useMemo, useState } from 'react';
import MS from '../MS';
import { Stagger } from '../StitchMotion';
import useBudgetStore from '../../stores/useBudgetStore';
import useTransactionStore from '../../stores/useTransactionStore';
import useCategoryStore from '../../stores/useCategoryStore';
import useDebtStore from '../../stores/useDebtStore';
import useRateStore from '../../stores/useRateStore';
import { getBudgetSummary, sumAmounts, calculateBudgetProgress } from '../../utils/calculations';
import { formatCurrency } from '../../utils/formatters';
import { MONTHS_ES } from '../../utils/constants';
import toast from 'react-hot-toast';

const fmt = (n) => formatCurrency(n);

// Input de estimado que solo persiste al perder foco.
function EnvelopeInput({ initial, onSave }) {
  const [v, setV] = useState(initial ? String(initial) : '');
  return (
    <input
      value={v}
      onChange={(e) => setV(e.target.value.replace(/[^0-9.]/g, ''))}
      onBlur={() => onSave(v)}
      placeholder="0"
      inputMode="decimal"
      className="w-24 bg-surface-container-lowest border border-border-subtle rounded py-xs px-sm font-mono-data text-[11px] text-right text-on-surface focus:outline-none focus:border-primary inner-glow"
    />
  );
}

export default function StitchBudget() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const budgets = useBudgetStore((s) => s.budgets);
  const { setBudget, copyBudgetFromPreviousMonth } = useBudgetStore();
  const { transactions } = useTransactionStore();
  const { categories } = useCategoryStore();
  const debts = useDebtStore((s) => s.debts);
  const payments = useDebtStore((s) => s.payments);
  const getTotalMonthlyPayment = useDebtStore((s) => s.getTotalMonthlyPayment);
  const fxRate = useRateStore((s) => s.getRate());

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
  const navMonth = (dir) => {
    if (dir > 0 && isCurrentMonth) return;
    let mm = month + dir, yy = year;
    if (mm < 0) { mm = 11; yy--; } else if (mm > 11) { mm = 0; yy++; }
    setMonth(mm); setYear(yy);
  };

  const monthBudgets = useMemo(() => budgets.filter((b) => b.year === year && b.month === month), [budgets, year, month]);
  const monthTx = useMemo(() => transactions.filter((t) => {
    const d = new Date(t.date + 'T00:00:00');
    return d.getFullYear() === year && d.getMonth() === month;
  }), [transactions, year, month]);

  const debtPaid = useMemo(() => payments.reduce((sum, p) => {
    const d = new Date(p.date + 'T00:00:00');
    if (d.getFullYear() !== year || d.getMonth() !== month) return sum;
    const debt = debts.find((dd) => dd.id === p.debtId);
    const val = Number(p.amount) || 0;
    return sum + (debt && debt.currency === 'USD' ? val * fxRate : val);
  }, 0), [payments, debts, year, month, fxRate]);

  const summary = useMemo(() => getBudgetSummary({
    monthTransactions: monthTx, monthBudgets, categories,
    debtPlanned: getTotalMonthlyPayment(), debtPaid,
  }), [monthTx, monthBudgets, categories, getTotalMonthlyPayment, debtPaid]);

  // Sobres por categoría activa
  const rows = useMemo(() => categories.filter((c) => c.isActive).map((cat) => {
    const b = monthBudgets.find((x) => x.categoryId === cat.id);
    const estimated = b ? b.estimatedAmount : 0;
    const actual = sumAmounts(monthTx.filter((t) => t.categoryId === cat.id));
    const pct = calculateBudgetProgress(actual, estimated);
    return { cat, estimated, actual, pct };
  }), [categories, monthBudgets, monthTx]);

  const totalEstimated = rows.reduce((s, r) => s + r.estimated, 0);

  // Gasto diario promedio (variable + fijo del mes)
  const daysElapsed = isCurrentMonth ? now.getDate() : new Date(year, month + 1, 0).getDate();
  const dailyBurn = daysElapsed > 0 ? summary.variableGastado / daysElapsed : 0;

  const consumedPct = summary.ingresoRecibido > 0
    ? Math.min(100, (summary.comprometido + summary.variableGastado) / summary.ingresoRecibido * 100)
    : 0;

  const estadoLabel = { good: 'ÓPTIMO', warning: 'AJUSTADO', danger: 'EN RIESGO', neutral: 'SIN DATOS' }[summary.estado];
  const estadoColor = { good: 'text-tertiary', warning: 'text-accent-warning', danger: 'text-accent-error', neutral: 'text-text-muted' }[summary.estado];

  const handleSave = (cat, val) => {
    const num = Number(val) || 0;
    setBudget(cat.id, year, month, num);
  };

  const handleCopy = async () => {
    const ok = await copyBudgetFromPreviousMonth(year, month);
    toast[ok ? 'success' : 'error'](ok ? 'Presupuesto copiado del mes anterior' : 'No hay presupuesto en el mes anterior');
  };

  const typeColor = (t) => ({ income: 'bg-tertiary', fixed_expense: 'bg-primary', variable_expense: 'bg-accent-warning', savings: 'bg-secondary' }[t] || 'bg-primary');

  return (
    <div className="p-md sm:p-margin-safe max-w-[1728px] mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-xl gap-lg">
        <div>
          <div className="flex items-center gap-sm mb-xs">
            <div className="w-1.5 h-1.5 rounded-full bg-secondary live-dot" />
            <span className="font-mono-data text-mono-data text-secondary uppercase">Presupuesto base cero</span>
          </div>
          <h1 className="font-hero-headline text-headline-lg md:text-[56px] text-on-background tracking-tighter leading-none">PRESUPUESTO</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Asigna cada peso. Lo comprometido sale del ingreso; lo que queda es lo que puedes gastar.</p>
        </div>
        <div className="flex gap-md bg-surface-card p-sm rounded border border-border-subtle inner-glow items-center">
          <button onClick={() => navMonth(-1)} className="p-xs rounded hover:bg-surface-container-high text-on-surface-variant"><MS name="chevron_left" className="text-[18px]" /></button>
          <div className="flex flex-col px-sm py-xs border-x border-border-subtle text-center min-w-[120px]">
            <span className="font-mono-data text-mono-data text-text-muted">PERÍODO</span>
            <span className="font-label-sm text-label-sm text-on-background mt-1">{MONTHS_ES[month]} {year}</span>
          </div>
          <button onClick={() => navMonth(1)} disabled={isCurrentMonth} className="p-xs rounded hover:bg-surface-container-high text-on-surface-variant disabled:opacity-30"><MS name="chevron_right" className="text-[18px]" /></button>
          <div className="flex flex-col px-md py-xs">
            <span className="font-mono-data text-mono-data text-text-muted">ESTADO</span>
            <span className={`font-label-sm text-label-sm mt-1 ${estadoColor}`}>{estadoLabel}</span>
          </div>
        </div>
      </div>

      {/* Bento */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter mb-gutter">
        {/* Macro: puedes gastar */}
        <div className="md:col-span-8 bg-surface-panel border border-border-subtle rounded-lg inner-glow p-lg flex flex-col">
          <div className="flex justify-between items-center mb-lg border-b border-border-subtle pb-sm">
            <h2 className="font-mono-data text-mono-data text-on-surface-variant">DISPONIBLE PARA GASTAR</h2>
            <MS name="timeline" className="text-text-muted text-[16px]" />
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <div className="flex justify-between items-end mb-xs">
              <div className="flex flex-col">
                <span className="font-mono-data text-mono-data text-text-muted">PUEDES GASTAR</span>
                <span className={`font-headline-md text-[36px] tracking-tighter ${summary.disponible < 0 ? 'text-accent-error' : 'text-tertiary'}`}>{fmt(summary.puedesGastar)}</span>
              </div>
              <div className="flex flex-col text-right">
                <span className="font-mono-data text-mono-data text-text-muted">COMPROMETIDO</span>
                <span className="font-headline-md text-[24px] text-on-background tracking-tighter">{fmt(summary.comprometido)}</span>
              </div>
            </div>
            <div className="w-full h-1 bg-surface-container-highest mt-md relative">
              <div className="absolute top-0 left-0 h-full bg-primary" style={{ width: `${consumedPct}%` }} />
            </div>
            <div className="flex justify-between mt-sm">
              <span className="font-mono-data text-mono-data text-text-muted">Ingreso {fmt(summary.ingresoRecibido)}</span>
              <span className="font-mono-data text-mono-data text-primary">{consumedPct.toFixed(0)}% comprometido</span>
              <span className="font-mono-data text-mono-data text-text-muted">Por asignar {fmt(summary.porAsignar)}</span>
            </div>
          </div>
        </div>

        {/* Daily burn */}
        <div className="md:col-span-4 bg-surface-panel border border-border-subtle rounded-lg inner-glow p-lg flex flex-col">
          <div className="flex justify-between items-center mb-lg border-b border-border-subtle pb-sm">
            <h2 className="font-mono-data text-mono-data text-on-surface-variant">GASTO VARIABLE / DÍA</h2>
            <MS name="local_fire_department" className="text-accent-warning text-[16px]" />
          </div>
          <div className="flex-1 flex flex-col justify-center items-center text-center">
            <span className="font-hero-headline text-[48px] text-on-background tracking-tighter leading-none">{fmt(dailyBurn)}</span>
            <span className="font-mono-data text-mono-data text-text-muted mt-sm">PROMEDIO · {daysElapsed} DÍAS</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant mt-md">Variable gastado: {fmt(summary.variableGastado)}</span>
          </div>
        </div>
      </div>

      {/* Sobres */}
      <div className="bg-surface-panel border border-border-subtle rounded-lg inner-glow p-lg">
        <div className="flex flex-wrap justify-between items-center gap-md mb-lg border-b border-border-subtle pb-sm">
          <h2 className="font-mono-data text-mono-data text-on-surface-variant">SOBRES POR CATEGORÍA · {fmt(totalEstimated)} ASIGNADO</h2>
          <div className="flex gap-sm">
            <button onClick={handleCopy} className="flex items-center gap-xs bg-transparent border border-border-subtle text-on-surface font-mono-data text-mono-data uppercase px-md py-xs rounded hover:bg-surface-container-high transition-colors">
              <MS name="content_copy" className="text-[14px]" /> Copiar mes ant.
            </button>
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="font-body-md text-body-md text-text-muted py-lg text-center">No hay categorías activas.</p>
        ) : (
          <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md">
            {rows.map(({ cat, estimated, actual, pct }) => {
              const over = pct > 100;
              return (
                <Stagger.Item key={cat.id} className="bg-surface-card border border-border-subtle rounded p-md inner-glow flex flex-col gap-sm">
                  <div className="flex justify-between items-center">
                    <span className="font-label-sm text-label-sm text-on-surface flex items-center gap-xs">
                      <span>{cat.icon}</span> {cat.name}
                    </span>
                    <EnvelopeInput initial={estimated} onSave={(v) => handleSave(cat, v)} />
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="font-mono-data text-[15px] text-on-background tracking-tight">{fmt(actual)}</span>
                    <span className="font-mono-data text-mono-data text-text-muted">de {fmt(estimated)}</span>
                  </div>
                  <div className="w-full h-1 bg-surface-container-highest rounded-full overflow-hidden">
                    <div className={`h-full ${over ? 'bg-accent-error' : typeColor(cat.type)}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                </Stagger.Item>
              );
            })}
          </Stagger>
        )}
      </div>
    </div>
  );
}
