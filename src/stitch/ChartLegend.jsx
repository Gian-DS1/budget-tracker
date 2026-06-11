// Leyenda compartida de los gráficos (Dashboard y Reportes): mismo lenguaje
// visual en todas las visualizaciones. `items` = [{ label, color, shape }] con
// shape 'line' (default) o 'bar'; `right` = texto de contexto opcional.
export default function ChartLegend({ items, right }) {
  return (
    <div className="flex items-center justify-between gap-sm mb-sm">
      <div className="flex items-center gap-md flex-wrap">
        {items.map((it) => (
          <span key={it.label} className="flex items-center gap-xs font-mono-data text-mono-data text-text-muted uppercase">
            <span
              className={it.shape === 'bar' ? 'w-2.5 h-2.5 rounded-[3px]' : 'w-2.5 h-0.5 rounded-full'}
              style={{ background: it.color }}
            />
            {it.label}
          </span>
        ))}
      </div>
      {right && <span className="font-mono-data text-mono-data text-text-muted uppercase">{right}</span>}
    </div>
  );
}
