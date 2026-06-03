// Donut de gastos del mes por categoría (top 5 + Otros). Centro = gasto total.
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { formatCurrency } from '../../../utils/formatters';
import { EmptyCell } from './dashboardUi';

const fmt = (n) => formatCurrency(n);

function DonutTip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-surface-card border border-border-subtle rounded p-sm inner-glow">
      <div className="font-mono-data text-mono-data text-on-surface">{d.name}</div>
      <div className="font-mono-data text-mono-data text-text-muted">{fmt(d.value)} · {d.pct.toFixed(0)}%</div>
    </div>
  );
}

export default function CategoryDonut({ data }) {
  if (!data || data.length === 0) return <EmptyCell icon="donut_small" message="Sin gastos registrados este mes." />;
  const total = data.reduce((s, d) => s + d.value, 0);
  const withPct = data.map((d) => ({ ...d, pct: total > 0 ? (d.value / total) * 100 : 0 }));

  return (
    <div className="flex-grow flex items-center gap-md min-h-[200px]">
      <div className="relative w-[140px] h-[140px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={withPct} dataKey="value" nameKey="name" innerRadius={45} outerRadius={68} paddingAngle={2} stroke="none">
              {withPct.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Pie>
            <Tooltip content={<DonutTip />} isAnimationActive={false} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="font-mono-data text-[9px] text-text-muted uppercase">Total</span>
          <span className="font-headline-md text-[13px] text-on-surface">{fmt(total)}</span>
        </div>
      </div>
      <div className="flex flex-col gap-xs min-w-0 flex-grow">
        {withPct.map((d, i) => (
          <div key={i} className="flex items-center gap-xs font-mono-data text-mono-data">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
            <span className="text-on-surface-variant truncate flex-grow">{d.name}</span>
            <span className="text-text-muted shrink-0">{d.pct.toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
