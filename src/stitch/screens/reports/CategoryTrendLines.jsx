// Líneas multi-serie: gasto de las top categorías a lo largo del periodo.
import { ResponsiveContainer, LineChart, Line, XAxis, Tooltip, Legend } from 'recharts';
import { formatCurrency } from '../../../utils/formatters';

const fmt = (n) => formatCurrency(n);

function Tip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-card border border-border-subtle rounded p-sm inner-glow">
      <div className="font-mono-data text-mono-data text-on-surface uppercase mb-xs">{label}</div>
      {payload.map((p) => (
        <div key={p.name} className="font-mono-data text-mono-data" style={{ color: p.stroke }}>{p.name}: {fmt(p.value)}</div>
      ))}
    </div>
  );
}

export default function CategoryTrendLines({ months, series }) {
  if (!series || series.length === 0) {
    return <p className="font-body-md text-body-md text-text-muted py-xl text-center">Sin gastos para analizar tendencia.</p>;
  }
  // Recharts consume filas: [{ label, <catName>: value, ... }]
  const rows = months.map((label, i) => {
    const row = { label };
    series.forEach((s) => { row[s.name] = s.data[i]; });
    return row;
  });
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <XAxis dataKey="label" tick={{ fill: '#9a9da3', fontSize: 10 }} axisLine={{ stroke: '#232426' }} tickLine={false} />
          <Tooltip content={<Tip />} isAnimationActive={false} />
          <Legend wrapperStyle={{ fontSize: 11, color: '#9a9da3' }} />
          {series.map((s) => (
            <Line key={s.name} type="monotone" dataKey={s.name} stroke={s.color} strokeWidth={2} dot={false} isAnimationActive={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
