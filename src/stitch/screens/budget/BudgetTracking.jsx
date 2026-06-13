// Nivel SEGUIMIENTO — el más simple. Sin metas ni presupuesto: solo refleja el
// mes (ingreso, gastos, balance) y muestra a dónde se fue el dinero por categoría.
// Valor inmediato y cero configuración. Lenguaje cotidiano.
import { useMemo } from 'react';
import MS from '../../MS';
import Emoji from '../../Emoji';
import { Stagger } from '../../StitchMotion';
import { useI18n } from '../../../contexts/I18nContext';
import { groupByCategory } from '../../../utils/calculations';
import { formatCurrency } from '../../../utils/formatters';

const fmt = (n) => formatCurrency(n);

const EXPENSE_TYPES = new Set(['expense', 'fixed_expense', 'variable_expense']);

export default function BudgetTracking({ monthTx, categories, summary }) {
  const { t } = useI18n();
  const ingreso = summary.ingresoRecibido;
  // Gastos del mes = fijos reales + variables (los buckets ya netos de cashback).
  const gastos = summary.gastosFijosReal + summary.variableGastado;
  const balance = ingreso - gastos;

  // Gasto por categoría (solo gastos), de mayor a menor.
  const byCat = useMemo(() => {
    const expenseTx = monthTx.filter((t) => {
      const cat = categories.find((c) => c.id === t.categoryId);
      return cat && EXPENSE_TYPES.has(cat.type);
    });
    return groupByCategory(expenseTx, categories)
      .filter((g) => g.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [monthTx, categories]);

  const maxTotal = byCat.length > 0 ? byCat[0].total : 0;
  // % del ingreso ya gastado (la pregunta del nivel Seguimiento: "¿cuánto me queda?").
  const spentPct = ingreso > 0 ? Math.min(100, (gastos / ingreso) * 100) : 0;

  return (
    <>
      {/* Hero: el balance manda; ingreso y gastos lo acompañan, y la barra
          cuenta la historia completa (cuánto del ingreso ya se fue). */}
      <div className="bg-surface-panel border border-border-subtle rounded-lg inner-glow p-lg mb-gutter">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-md">
          <div className="flex flex-col">
            <span className="font-mono-data text-mono-data text-text-muted uppercase">{t('common.balance')}</span>
            <span className={`font-headline-md text-[40px] tracking-tighter ${balance < 0 ? 'text-accent-error' : 'text-tertiary'}`}>{fmt(balance)}</span>
          </div>
          <div className="flex gap-xl sm:text-right">
            <div className="flex flex-col">
              <span className="font-mono-data text-mono-data text-text-muted uppercase flex items-center gap-xs sm:justify-end"><MS name="south_west" className="!text-[13px] text-tertiary" /> {t('screens.budget.incomeOfMonth')}</span>
              <span className="font-headline-md text-[22px] text-on-background tracking-tighter">{fmt(ingreso)}</span>
            </div>
            <div className="flex flex-col">
              <span className="font-mono-data text-mono-data text-text-muted uppercase flex items-center gap-xs sm:justify-end"><MS name="north_east" className="!text-[13px] text-accent-error" /> {t('screens.budget.expensesOfMonth')}</span>
              <span className="font-headline-md text-[22px] text-on-background tracking-tighter">{fmt(gastos)}</span>
            </div>
          </div>
        </div>
        {ingreso > 0 && (
          <div className="mt-md">
            <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${gastos > ingreso ? 'bg-accent-error' : 'bg-primary'}`} style={{ width: `${spentPct}%` }} />
            </div>
            <span className="font-mono-data text-mono-data text-text-muted normal-case tracking-normal mt-xs block">
              {t('screens.budget.spentOfIncome').replace('{pct}', (ingreso > 0 ? (gastos / ingreso) * 100 : 0).toFixed(0))}
            </span>
          </div>
        )}
      </div>

      {/* A dónde se fue el dinero */}
      <div className="bg-surface-panel border border-border-subtle rounded-lg inner-glow p-lg">
        <div className="flex justify-between items-center mb-lg border-b border-border-subtle pb-sm">
          <h2 className="font-mono-data text-mono-data text-on-surface-variant">{t('screens.budget.whereMoneyWent').toUpperCase()}</h2>
          <MS name="insights" className="text-text-muted text-[16px]" />
        </div>

        {byCat.length === 0 ? (
          <div className="py-[48px] flex flex-col items-center text-center gap-sm">
            <MS name="receipt_long" className="text-[32px] text-text-muted" />
            <p className="font-body-md text-body-md text-on-surface-variant">{t('screens.budget.noExpensesYet')}</p>
          </div>
        ) : (
          <Stagger className="flex flex-col gap-sm">
            {byCat.map((g, i) => {
              // % sobre el GASTO total (composición), no sobre el ingreso: en
              // "a dónde se fue el dinero" la pregunta es qué parte del gasto es.
              const share = gastos > 0 ? (g.total / gastos) * 100 : 0;
              const barW = maxTotal > 0 ? (g.total / maxTotal) * 100 : 0;
              return (
                <Stagger.Item key={g.category.id} className="flex flex-col gap-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-label-sm text-label-sm text-on-surface flex items-center gap-xs min-w-0">
                      <span className="font-mono-data text-mono-data text-text-muted w-[18px] shrink-0">{String(i + 1).padStart(2, '0')}</span>
                      <Emoji e={g.category.icon} size={16} /> <span className="truncate">{g.category.name}</span>
                    </span>
                    <div className="flex items-baseline gap-sm whitespace-nowrap">
                      <span className="font-mono-data text-[13px] text-on-background">{fmt(g.total)}</span>
                      <span className="font-mono-data text-mono-data text-text-muted w-[34px] text-right">{share.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="w-full h-1 bg-surface-container-highest rounded-full overflow-hidden ml-[26px] max-w-[calc(100%-26px)]">
                    <div className="h-full bg-primary" style={{ width: `${barW}%` }} />
                  </div>
                </Stagger.Item>
              );
            })}
          </Stagger>
        )}
      </div>
    </>
  );
}
