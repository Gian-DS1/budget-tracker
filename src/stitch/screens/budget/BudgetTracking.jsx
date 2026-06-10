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

  return (
    <>
      {/* Resumen del mes */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-gutter mb-gutter">
        <Stat label={t('screens.budget.incomeOfMonth')} value={fmt(ingreso)} icon="south_west" tone="text-tertiary" />
        <Stat label={t('screens.budget.expensesOfMonth')} value={fmt(gastos)} icon="north_east" tone="text-accent-error" />
        <Stat label={t('common.balance')} value={fmt(balance)} icon="account_balance" tone={balance < 0 ? 'text-accent-error' : 'text-on-background'} />
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
            {byCat.map((g) => {
              const share = ingreso > 0 ? (g.total / ingreso) * 100 : 0;
              const barW = maxTotal > 0 ? (g.total / maxTotal) * 100 : 0;
              return (
                <Stagger.Item key={g.category.id} className="flex flex-col gap-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-label-sm text-label-sm text-on-surface flex items-center gap-xs min-w-0">
                      <Emoji e={g.category.icon} size={16} /> <span className="truncate">{g.category.name}</span>
                    </span>
                    <div className="flex items-baseline gap-sm whitespace-nowrap">
                      <span className="font-mono-data text-[13px] text-on-background">{fmt(g.total)}</span>
                      {ingreso > 0 && <span className="font-mono-data text-mono-data text-text-muted">{share.toFixed(0)}%</span>}
                    </div>
                  </div>
                  <div className="w-full h-1 bg-surface-container-highest rounded-full overflow-hidden">
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

function Stat({ label, value, icon, tone }) {
  return (
    <div className="bg-surface-panel border border-border-subtle rounded-lg inner-glow p-lg flex flex-col gap-sm">
      <div className="flex items-center justify-between">
        <span className="font-mono-data text-mono-data text-text-muted uppercase">{label}</span>
        <MS name={icon} className={`text-[16px] ${tone}`} />
      </div>
      <span className={`font-headline-md text-[32px] tracking-tighter ${tone}`}>{value}</span>
    </div>
  );
}
