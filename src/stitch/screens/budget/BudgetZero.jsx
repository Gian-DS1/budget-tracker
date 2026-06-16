// Nivel BASE CERO — sobres por categoría (estimado editable + gastado real).
// Conserva el lenguaje técnico (sobres, comprometido, por asignar): su público es
// el usuario avanzado. Recibe el contexto del mes desde BudgetShell.
import { useMemo } from 'react';
import toast from 'react-hot-toast';
import MS from '../../MS';
import InfoTip from '../../InfoTip';
import { Stagger } from '../../StitchMotion';
import { useI18n } from '../../../contexts/I18nContext';
import EnvelopeRow from './EnvelopeRow';
import useBudgetStore from '../../../stores/useBudgetStore';
import { isDemoActive, demoSetBudget, demoCopyBudgetFromPreviousMonth } from '../../demoMode';
import { sumAmounts, calculateBudgetProgress } from '../../../utils/calculations';
import { formatCurrency } from '../../../utils/formatters';

const fmt = (n) => formatCurrency(n);

// Agrupación de sobres por tipo, en el orden del flujo base cero. Cada grupo
// tiene su color de acento (coherente con el resto del tema) e icono.
const GROUP_ORDER = [
  { key: 'income', labelKey: 'common.income', icon: 'trending_up', cls: 'text-tertiary' },
  { key: 'fixed_expense', labelKey: 'screens.categories.fixedExpensesSection', icon: 'event_repeat', cls: 'text-accent-warning' },
  { key: 'variable_expense', labelKey: 'screens.categories.variableExpensesSection', icon: 'shopping_cart', cls: 'text-primary' },
  { key: 'savings', labelKey: 'types.savings', icon: 'savings', cls: 'text-secondary' },
];
// Mapea cualquier tipo de categoría a una de las 4 cubetas (el genérico
// 'expense' se trata como gasto variable).
const GROUP_OF = {
  income: 'income',
  fixed_expense: 'fixed_expense',
  variable_expense: 'variable_expense',
  expense: 'variable_expense',
  savings: 'savings',
};

export default function BudgetZero({ year, month, monthBudgets, monthTx, categories, summary, debtCategoryId }) {
  const { t } = useI18n();
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

  // Agrupa los sobres por TIPO de categoría, en el orden del flujo base cero
  // (ingreso → fijo → variable → ahorro). Dentro de cada grupo: primero las que
  // tienen monto asignado (de mayor a menor, para que lo más relevante salte a
  // la vista), y después las sin monto en orden alfabético. La categoría de
  // deuda (managed) usa su cuota como estimado, así que ordena junto al resto.
  const groups = useMemo(() => {
    const collated = rows.reduce((acc, r) => {
      const key = GROUP_OF[r.cat.type] || 'variable_expense';
      (acc[key] = acc[key] || []).push(r);
      return acc;
    }, {});
    return GROUP_ORDER
      .map((g) => ({
        ...g,
        items: (collated[g.key] || []).sort((a, b) => {
          const aHas = a.estimated > 0;
          const bHas = b.estimated > 0;
          if (aHas !== bHas) return aHas ? -1 : 1;            // con monto antes que sin monto
          if (aHas && bHas && a.estimated !== b.estimated) return b.estimated - a.estimated; // mayor primero
          return (a.cat.name || '').localeCompare(b.cat.name || '', 'es', { sensitivity: 'base' });
        }),
      }))
      .filter((g) => g.items.length > 0)
      .map((g) => ({
        ...g,
        subtotal: g.items.reduce((s, r) => s + r.estimated, 0),
        spent: g.items.reduce((s, r) => s + r.actual, 0),
      }));
  }, [rows]);

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
    toast[ok ? 'success' : 'error'](ok ? t('pages.budgetCopy') : t('pages.noPreviousBudget'));
  };

  return (
    <>
      <p className="font-body-md text-body-md text-on-surface-variant mb-lg">
        {t('dashboard.assignBudget')}
      </p>

      {/* Bento: disponible (con "por asignar" como métrica de primer nivel:
          en base cero, dinero sin asignar es tarea pendiente) + daily burn */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter mb-gutter">
        <div className="md:col-span-8 bg-surface-panel border border-border-subtle rounded-lg inner-glow p-lg flex flex-col">
          <div className="flex justify-between items-center mb-lg border-b border-border-subtle pb-sm">
            <h2 className="font-mono-data text-mono-data text-on-surface-variant">{t('screens.budget.available').toUpperCase()}</h2>
            <MS name="timeline" className="text-text-muted text-[16px]" />
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <div className="flex flex-wrap justify-between items-end gap-md mb-xs">
              <div className="flex flex-col">
                <span className="font-mono-data text-mono-data text-text-muted inline-flex items-center gap-xs">{t('dashboard.canSpend').toUpperCase()} <InfoTip text={t('screens.budget.canSpendInfo')} /></span>
                <span className={`font-headline-md text-[36px] tracking-tighter ${summary.disponible < 0 ? 'text-accent-error' : 'text-tertiary'}`}>{fmt(summary.puedesGastar)}</span>
              </div>
              <div className="flex gap-xl text-right">
                <div className="flex flex-col items-end">
                  <span className="font-mono-data text-mono-data text-text-muted inline-flex items-center gap-xs">{t('screens.budget.committed').toUpperCase()} <InfoTip text={t('screens.budget.committedInfo')} /></span>
                  <span className="font-headline-md text-[24px] text-on-background tracking-tighter">{fmt(summary.comprometido)}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-mono-data text-mono-data text-text-muted inline-flex items-center gap-xs">{t('screens.budget.toAllocate').toUpperCase()} <InfoTip text={t('screens.budget.toAllocateInfo')} /></span>
                  <span className={`font-headline-md text-[24px] tracking-tighter ${summary.porAsignar > 0 ? 'text-accent-warning' : 'text-on-background'}`}>{fmt(summary.porAsignar)}</span>
                </div>
              </div>
            </div>
            <div className="w-full h-1 bg-surface-container-highest mt-md relative">
              <div className="absolute top-0 left-0 h-full bg-primary" style={{ width: `${consumedPct}%` }} />
            </div>
            <div className="flex justify-between mt-sm">
              <span className="font-mono-data text-mono-data text-text-muted">{t('transactions.income')} {fmt(summary.ingresoRecibido)}</span>
              <span className="font-mono-data text-mono-data text-primary">{consumedPct.toFixed(0)}% {t('screens.budget.committed').toLowerCase()}</span>
            </div>
          </div>
        </div>

        <div className="md:col-span-4 bg-surface-panel border border-border-subtle rounded-lg inner-glow p-lg flex flex-col">
          <div className="flex justify-between items-center mb-lg border-b border-border-subtle pb-sm">
            <h2 className="font-mono-data text-mono-data text-on-surface-variant">{t('screens.budget.variablePerDay').toUpperCase()}</h2>
            <MS name="local_fire_department" className="text-accent-warning text-[16px]" />
          </div>
          <div className="flex-1 flex flex-col justify-center items-center text-center">
            <span className="font-hero-headline text-[48px] text-on-background tracking-tighter leading-none">{fmt(dailyBurn)}</span>
            <span className="font-mono-data text-mono-data text-text-muted mt-sm">{t('screens.budget.average').toUpperCase()} · {daysElapsed} {t('screens.budget.days').toUpperCase()}</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant mt-md">{t('screens.budget.variableSpent')} {fmt(summary.variableGastado)}</span>
          </div>
        </div>
      </div>

      {/* Sobres */}
      <div className="bg-surface-panel border border-border-subtle rounded-lg inner-glow p-lg">
        <div className="flex flex-wrap justify-between items-center gap-md mb-lg border-b border-border-subtle pb-sm">
          <h2 className="font-mono-data text-mono-data text-on-surface-variant">{t('screens.budget.envelopesByCategory').toUpperCase()} · {fmt(totalEstimated)} {t('screens.budget.assigned').toUpperCase()}</h2>
          <button onClick={handleCopy} className="flex items-center gap-xs bg-transparent border border-border-subtle text-on-surface font-mono-data text-mono-data uppercase px-md py-xs rounded hover:bg-surface-container-high transition-colors">
            <MS name="content_copy" className="text-[14px]" /> {t('screens.budget.copyPrevMonth')}
          </button>
        </div>

        {rows.length === 0 ? (
          <p className="font-body-md text-body-md text-text-muted py-lg text-center">{t('screens.budget.noActiveCategories')}</p>
        ) : (
          <div className="flex flex-col gap-lg">
            {groups.map((g) => (
              <section key={g.key}>
                {/* Encabezado de grupo: tipo + real vs asignado, con mini barra
                    de avance del grupo (lee el estado del bloque de un vistazo). */}
                <div className="flex items-center justify-between gap-sm mb-xs">
                  <div className="flex items-center gap-sm min-w-0">
                    <MS name={g.icon} className={`!text-[16px] ${g.cls}`} />
                    <span className={`font-mono-data text-mono-data uppercase tracking-widest ${g.cls}`}>{t(g.labelKey)}</span>
                    <span className="font-mono-data text-mono-data text-text-muted">· {g.items.length}</span>
                  </div>
                  <span className="font-mono-data text-mono-data text-text-muted whitespace-nowrap">
                    <span className="text-on-surface-variant">{fmt(g.spent)}</span> {t('screens.charts.of')} {fmt(g.subtotal)} {t('screens.budget.assigned').toLowerCase()}
                  </span>
                </div>
                <div className="w-full h-0.5 bg-surface-container-highest rounded-full overflow-hidden mb-md">
                  <div
                    className={`h-full ${g.subtotal > 0 && g.spent > g.subtotal ? 'bg-accent-error' : 'bg-primary'}`}
                    style={{ width: `${g.subtotal > 0 ? Math.min(100, (g.spent / g.subtotal) * 100) : 0}%` }}
                  />
                </div>
                <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md">
                  {g.items.map((r) => (
                    // La key incluye año-mes para que React REMONTE la fila al
                    // cambiar de período. Sin esto, el estado local del input
                    // (inicializado solo al montar) conservaba el monto del mes
                    // anterior y, al perder foco, lo guardaba en el mes actual
                    // ("el presupuesto se cambia solo / jala datos de meses previos").
                    <EnvelopeRow key={`${r.cat.id}-${year}-${month}`} {...r} onSave={(v) => handleSave(r.cat, v)} />
                  ))}
                </Stagger>
              </section>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
