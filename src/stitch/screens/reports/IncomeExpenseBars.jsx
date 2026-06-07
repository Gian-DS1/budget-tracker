// Barras agrupadas: ingreso vs gasto por mes. Tooltip fijo con ambos + balance.
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, Legend } from 'recharts';
import { formatCurrency } from '../../../utils/formatters';
import { CHART } from '../../chartTokens';

const fmt = (n) => formatCurrency(n);

function Tip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const bal = d.income - d.expense;
  return (
    <div className="bg-surface-card border border-border-subtle rounded p-sm inner-glow">
      <div className="font-mono-data text-mono-data text-on-surface uppercase mb-xs">{label}</div>
      <div className="font-mono-data text-mono-data text-tertiary">Ingresos {fmt(d.income)}</div>
      <div className="font-mono-data text-mono-data text-accent-error">Gastos {fmt(d.expense)}</div>
      <div className="font-mono-data text-mono-data text-on-surface">Balance {fmt(bal)}</div>
    </div>
  );
}

export default function IncomeExpenseBars({ data }) {
  const hasData = data.some((d) => d.income !== 0 || d.expense !== 0);
  if (!hasData) {
    return <p className="font-body-md text-body-md text-text-muted py-xl text-center">Sin movimientos en el periodo.</p>;
  }
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }} barGap={2} barCategoryGap="20%">
          <XAxis dataKey="label" tick={{ fill: CHART.muted, fontSize: 10 }} axisLine={{ stroke: CHART.border }} tickLine={false} />
          <Tooltip content={<Tip />} isAnimationActive={false} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <Legend wrapperStyle={{ fontSize: 11, color: CHART.muted }} />
          <Bar dataKey="income" name="Ingresos" fill={CHART.tertiary} radius={[3, 3, 0, 0]} isAnimationActive animationDuration={600} animationEasing="ease-out" />
          <Bar dataKey="expense" name="Gastos" fill={CHART.error} radius={[3, 3, 0, 0]} isAnimationActive animationDuration={600} animationEasing="ease-out" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
