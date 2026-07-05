// Celda de un día: número, marca de HOY (anillo periwinkle), mini montos de
// movimientos y puntos de color de vencimientos. Clicable si hay algo que ver.
// Los mini montos son INDICADORES compactos (1.2M, 850K…): en una celda de
// ~44px no cabe un monto completo; el valor íntegro vive en el detalle del día
// que se abre al tocar. El K fijo anterior producía "1235K" y desbordaba.
import { formatAmountCompact } from '../../../utils/formatters';

// Indicador mini: sin decimales bajo 1000 (el ".00" es ruido a 10px) y
// compacto estándar (850.0K, 1.2M) de ahí en adelante.
const mini = (n) => {
  const abs = Math.abs(n);
  return abs < 1000 ? String(Math.round(abs)) : formatAmountCompact(abs);
};

export default function DayCell({ day, movement, dues, isToday, isSelected, onClick }) {
  const hasMov = !!movement;
  const hasDue = dues && dues.length > 0;
  const clickable = hasMov || hasDue;
  return (
    <button
      onClick={() => clickable && onClick(day)}
      className={`h-[clamp(48px,9vh,72px)] border rounded-sm p-xs flex flex-col text-left transition-colors ${clickable ? 'cursor-pointer hover:border-primary' : 'cursor-default'} ${isSelected ? 'border-primary bg-primary/10' : isToday ? 'border-primary/60 bg-surface-card' : 'border-border-subtle bg-surface-card'}`}
    >
      <span className={`font-mono-data text-[12px] ${isToday ? 'text-primary font-bold' : 'text-on-surface-variant'}`}>{day}</span>
      {/* Puntos de vencimiento */}
      {hasDue && (
        <div className="flex flex-wrap gap-px mt-px">
          {dues.slice(0, 4).map((d, i) => (
            <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: d.color }} />
          ))}
        </div>
      )}
      {/* Movimientos pasados (mini montos) */}
      {hasMov && (
        <div className="mt-auto flex flex-col gap-px leading-tight">
          {movement.income > 0 && <span className="font-mono-data text-[10px] text-tertiary">+{mini(movement.income)}</span>}
          {movement.expense > 0 && <span className="font-mono-data text-[10px] text-accent-error">−{mini(movement.expense)}</span>}
        </div>
      )}
    </button>
  );
}
