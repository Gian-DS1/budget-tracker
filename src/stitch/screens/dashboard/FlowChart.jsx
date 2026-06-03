// Flujo 6 meses: AreaChart de Recharts (balance neto), gradiente periwinkle,
// tooltip con ingresos/gastos/neto. Mismo lenguaje visual que Reportes.
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from 'recharts';
import { formatCurrency } from '../../../utils/formatters';
import { EmptyCell } from './dashboardUi';

const fmt = (n) => formatCurrency(n);

function FlowTip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-surface-card border border-border-subtle rounded p-sm inner-glow">
      <div className="font-mono-data text-mono-data text-on-surface uppercase mb-xs">{label}</div>
      <div className="font-mono-data text-mono-data text-tertiary">Ingresos {fmt(d.inc)}</div>
      <div className="font-mono-data text-mono-data text-accent-error">Gastos {fmt(d.exp)}</div>
      <div className="font-mono-data text-mono-data text-on-surface">Neto {fmt(d.net)}</div>
    </div>
  );
}

export default function FlowChart({ series }) {
  const hasData = series.some((s) => s.inc !== 0 || s.exp !== 0);
  if (!hasData) return <EmptyCell icon="show_chart" message="Aún sin movimientos para graficar." />;
  return (
    <div className="flex-grow min-h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <defs>
            <linearGradient id="dashFlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#bec2ff" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#bec2ff" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="label" tick={{ fill: '#9a9da3', fontSize: 10 }} axisLine={{ stroke: '#232426' }} tickLine={false} />
          <Tooltip content={<FlowTip />} isAnimationActive={false} cursor={{ stroke: '#454655', strokeWidth: 1 }} />
          <Area type="monotone" dataKey="net" stroke="#bec2ff" strokeWidth={2} fill="url(#dashFlow)" isAnimationActive animationDuration={600} animationEasing="ease-out" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
