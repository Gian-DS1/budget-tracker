// Tendencia de patrimonio líquido (efectivo + ahorros) ACUMULADO en el tiempo:
// la LÍNEA es la protagonista (cómo crece tu dinero mes a mes); las barras de
// ingreso/gasto van pequeñas y discretas de fondo, como contexto. Selector de
// rango (6 / 12 / desde el inicio) gestionado por el contenedor (Dashboard).
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
  return (
    <div className="bg-surface-card border border-border-subtle rounded p-sm inner-glow">
      <div className="font-mono-data text-mono-data text-on-surface uppercase mb-xs">{label}</div>
      <div className="font-mono-data text-mono-data text-primary">{t('dashboard.wealthTrend')} {fmt(d.wealth)}</div>
      <div className="font-mono-data text-mono-data text-tertiary mt-xs">{t('common.income')} {fmt(d.income)}</div>
      <div className="font-mono-data text-mono-data text-accent-error">{t('common.expenses')} {fmt(d.expense)}</div>
    </div>
  );
}

export default function WealthTrendChart({ data }) {
  const { t } = useI18n();
  const reduced = useReducedMotion();
  const hasData = data.some((d) => d.income !== 0 || d.expense !== 0 || d.wealth !== 0);
  if (!hasData) {
    return <p className="font-body-md text-body-md text-text-muted py-xl text-center">{t('screens.reports.noMovementsPeriod')}</p>;
  }

  return (
    <div className="flex flex-col h-72">
      <ChartLegend
        items={[
          { label: t('dashboard.wealthTrend'), color: CHART.secondary },
          { label: t('common.income'), color: CHART.tertiary, shape: 'bar' },
          { label: t('common.expenses'), color: CHART.error, shape: 'bar' },
        ]}
      />
      <div className="flex-grow min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barGap={1} barCategoryGap="35%">
            <CartesianGrid vertical={false} stroke={CHART.border} />
            <XAxis dataKey="label" tick={{ fill: CHART.muted, fontSize: 10 }} axisLine={{ stroke: CHART.border }} tickLine={false} />
            {/* Eje izquierdo: patrimonio (la línea). Eje derecho oculto: barras pequeñas. */}
            <YAxis yAxisId="wealth" tick={{ fill: CHART.muted, fontSize: 10 }} axisLine={false} tickLine={false} width={48} tickFormatter={formatAmountCompact} />
            <YAxis yAxisId="flow" orientation="right" hide domain={[0, (max) => max * 3]} />
            <Tooltip content={<Tip />} isAnimationActive={false} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
            {/* Barras pequeñas de contexto (eje derecho comprimido → quedan bajas). */}
            <Bar yAxisId="flow" dataKey="income" fill={CHART.tertiary} fillOpacity={0.45} radius={[2, 2, 0, 0]} maxBarSize={10} isAnimationActive={!reduced} animationDuration={600} animationEasing="ease-out" />
            <Bar yAxisId="flow" dataKey="expense" fill={CHART.error} fillOpacity={0.45} radius={[2, 2, 0, 0]} maxBarSize={10} isAnimationActive={!reduced} animationDuration={600} animationEasing="ease-out" />
            {/* La línea protagonista: patrimonio líquido acumulado. */}
            <Line yAxisId="wealth" type="monotone" dataKey="wealth" stroke={CHART.secondary} strokeWidth={2.5} dot={{ r: 2.5, fill: CHART.secondary }} activeDot={{ r: 4, fill: CHART.secondary, stroke: CHART.surface, strokeWidth: 1.5 }} isAnimationActive={!reduced} animationDuration={700} animationEasing="ease-out" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
