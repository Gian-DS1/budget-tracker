// Barras agrupadas (ingreso vs gasto por mes) + línea de balance neto encima:
// las barras dicen cuánto entró/salió, la línea cuenta la historia acumulada
// del periodo. Eje Y compacto y rejilla horizontal para leer magnitudes sin
// depender del tooltip. Leyenda compartida (mismo lenguaje que el Dashboard).
import { useReducedMotion } from 'framer-motion';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { formatCurrency, formatAmountCompact } from '../../../utils/formatters';
import { useI18n } from '../../../contexts/I18nContext';
import ChartLegend from '../../ChartLegend';
import { CHART } from '../../chartTokens';

const fmt = (n) => formatCurrency(n);

function Tip({ active, payload, label }) {
  const { t } = useI18n();
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const bal = d.income - d.expense;
  return (
    <div className="bg-surface-card border border-border-subtle rounded p-sm inner-glow">
      <div className="font-mono-data text-mono-data text-on-surface uppercase mb-xs">{label}</div>
      <div className="font-mono-data text-mono-data text-tertiary">{t('common.income')} {fmt(d.income)}</div>
      <div className="font-mono-data text-mono-data text-accent-error">{t('common.expenses')} {fmt(d.expense)}</div>
      <div className={`font-mono-data text-mono-data ${bal >= 0 ? 'text-on-surface' : 'text-accent-error'} mt-xs pt-xs border-t border-border-subtle`}>
        {t('common.balance')} {bal >= 0 ? '+' : '−'}{fmt(Math.abs(bal))}
      </div>
    </div>
  );
}

export default function IncomeExpenseBars({ data }) {
  const { t } = useI18n();
  const reduced = useReducedMotion();
  const hasData = data.some((d) => d.income !== 0 || d.expense !== 0);
  if (!hasData) {
    return <p className="font-body-md text-body-md text-text-muted py-xl text-center">{t('screens.reports.noMovementsPeriod')}</p>;
  }
  const withNet = data.map((d) => ({ ...d, net: d.income - d.expense }));

  return (
    <div className="flex flex-col h-72">
      <ChartLegend
        items={[
          { label: t('common.income'), color: CHART.tertiary, shape: 'bar' },
          { label: t('common.expenses'), color: CHART.error, shape: 'bar' },
          { label: t('common.balance'), color: CHART.secondary },
        ]}
      />
      <div className="flex-grow min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={withNet} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barGap={2} barCategoryGap="20%">
            <CartesianGrid vertical={false} stroke={CHART.border} />
            <XAxis dataKey="label" tick={{ fill: CHART.muted, fontSize: 10 }} axisLine={{ stroke: CHART.border }} tickLine={false} />
            <YAxis
              tick={{ fill: CHART.muted, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={48}
              tickFormatter={formatAmountCompact}
            />
            <Tooltip content={<Tip />} isAnimationActive={false} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
            <Bar dataKey="income" fill={CHART.tertiary} radius={[3, 3, 0, 0]} isAnimationActive={!reduced} animationDuration={600} animationEasing="ease-out" />
            <Bar dataKey="expense" fill={CHART.error} radius={[3, 3, 0, 0]} isAnimationActive={!reduced} animationDuration={600} animationEasing="ease-out" />
            <Line type="monotone" dataKey="net" stroke={CHART.secondary} strokeWidth={1.5} dot={false} activeDot={{ r: 3.5, fill: CHART.secondary, stroke: CHART.surface, strokeWidth: 1.5 }} isAnimationActive={!reduced} animationDuration={600} animationEasing="ease-out" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
