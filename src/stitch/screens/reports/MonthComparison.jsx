// Comparativa mes actual vs anterior por categoría: barra divergente + delta %.
import { formatCurrency } from '../../../utils/formatters';

const fmt = (n) => formatCurrency(n);

export default function MonthComparison({ data }) {
  const rows = (data || []).filter((d) => d.current > 0 || d.previous > 0).slice(0, 8);
  if (rows.length === 0) {
    return <p className="font-body-md text-body-md text-text-muted py-xl text-center">Necesita dos meses de datos para comparar.</p>;
  }
  // Escala: mayor cambio absoluto define el 100% de la mitad de la barra.
  const maxDelta = Math.max(1, ...rows.map((d) => Math.abs(d.current - d.previous)));

  return (
    <div className="flex flex-col gap-md">
      {rows.map((d) => {
        const delta = d.current - d.previous;
        const up = delta > 0;
        const widthPct = (Math.abs(delta) / maxDelta) * 50; // 0..50% del ancho total
        const isNew = d.previous === 0;
        return (
          <div key={d.name} className="flex items-center gap-sm">
            <span className="font-label-sm text-label-sm text-on-surface w-[120px] truncate shrink-0">{d.name}</span>
            {/* riel divergente: centro = sin cambio */}
            <div className="relative flex-grow h-3 bg-surface-container-highest rounded-full overflow-hidden">
              <div className="absolute top-0 bottom-0 left-1/2 w-px bg-border-subtle" />
              <div
                className="absolute top-0 bottom-0 rounded-full transition-all duration-500 ease-out"
                style={{
                  background: up ? '#ffb4ab' : '#bdd200',
                  width: `${widthPct}%`,
                  left: up ? '50%' : `${50 - widthPct}%`,
                }}
              />
            </div>
            <span className={`font-mono-data text-mono-data shrink-0 w-[64px] text-right ${up ? 'text-accent-error' : 'text-tertiary'}`}>
              {isNew ? 'nuevo' : `${up ? '+' : ''}${d.deltaPct.toFixed(0)}%`}
            </span>
            <span className="font-mono-data text-mono-data text-text-muted shrink-0 w-[90px] text-right hidden sm:inline">{fmt(d.current)}</span>
          </div>
        );
      })}
    </div>
  );
}
