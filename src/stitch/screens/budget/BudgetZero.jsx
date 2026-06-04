// Nivel BASE CERO — sobres por categoría (estimado editable + gastado real).
// Conserva el lenguaje técnico (sobres, comprometido, por asignar): su público es
// el usuario avanzado. Recibe el contexto del mes desde BudgetShell.
import { useMemo } from 'react';
import toast from 'react-hot-toast';
import MS from '../../MS';
import { Stagger } from '../../StitchMotion';
import EnvelopeRow from './EnvelopeRow';
import useBudgetStore from '../../../stores/useBudgetStore';
import { isDemoActive, demoSetBudget, demoCopyBudgetFromPreviousMonth } from '../../demoMode';
import { sumAmounts, calculateBudgetProgress } from '../../../utils/calculations';
import { formatCurrency } from '../../../utils/formatters';

const fmt = (n) => formatCurrency(n);

export default function BudgetZero({ year, month, monthBudgets, monthTx, categories, summary, debtCategoryId }) {
  const { setBudget, copyBudgetFromPreviousMonth } = useBudgetStore();
  const demo = isDemoActive();

  const rows = useMemo(
    () =>
      categories
        .filter((c) => c.isActive)
        .map((cat) => {
          const isDebt = debtCategoryId && cat.id === debtCategoryId;
          const b = monthBudgets.find((x) => x.categoryId === cat.id);
          // La categoría de deuda se gestiona desde el módulo Deudas: su
          // "estimado" es la cuota mensual comprometida (no un sobre editable).
          const estimated = isDebt ? (summary?.debtCommitted || summary?.debtPlanned || 0) : (b ? b.estimatedAmount : 0);
          const actual = sumAmounts(monthTx.filter((t) => t.categoryId === cat.id));
          return { cat, estimated, actual, pct: calculateBudgetProgress(actual, estimated), managed: isDebt };
        }),
    [categories, monthBudgets, monthTx, debtCategoryId, summary],
  );

  const totalEstimated = rows.reduce((s, r) => s + r.estimated, 0);

  // Gasto variable diario promedio.
  const now = new Date();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
  const daysElapsed = isCurrentMonth ? now.getDate() : new Date(year, month + 1, 0).getDate();
  const dailyBurn = daysElapsed > 0 ? summary.variableGastado / daysElapsed : 0;

  const consumedPct = summary.ingresoRecibido > 0
    ? Math.min(100, ((summary.comprometido + summary.variableGastado) / summary.ingresoRecibido) * 100)
    : 0;

  const handleSave = (cat, val) => {
    const num = Number(val) || 0;
    if (demo) demoSetBudget(cat.id, year, month, num);
    else setBudget(cat.id, year, month, num);
  };

  const handleCopy = async () => {
    const ok = demo ? demoCopyBudgetFromPreviousMonth(year, month) : await copyBudgetFromPreviousMonth(year, month);
    toast[ok ? 'success' : 'error'](ok ? 'Presupuesto copiado del mes anterior' : 'No hay presupuesto en el mes anterior');
  };

  return (
    <>
      <p className="font-body-md text-body-md text-on-surface-variant mb-lg">
        Asigna cada peso. Lo comprometido sale del ingreso; lo que queda es lo que puedes gastar.
      </p>

      {/* Bento: disponible + daily burn */}
      <div data-tour="budget-summary" className="grid grid-cols-1 md:grid-cols-12 gap-gutter mb-gutter">
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
          <button onClick={handleCopy} className="flex items-center gap-xs bg-transparent border border-border-subtle text-on-surface font-mono-data text-mono-data uppercase px-md py-xs rounded hover:bg-surface-container-high transition-colors">
            <MS name="content_copy" className="text-[14px]" /> Copiar mes ant.
          </button>
        </div>

        {rows.length === 0 ? (
          <p className="font-body-md text-body-md text-text-muted py-lg text-center">No hay categorías activas.</p>
        ) : (
          <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md">
            {rows.map((r) => (
              <EnvelopeRow key={r.cat.id} {...r} onSave={(v) => handleSave(r.cat, v)} />
            ))}
          </Stagger>
        )}
      </div>
    </>
  );
}
