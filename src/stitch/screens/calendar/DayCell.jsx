// Celda de un día: número, marca de HOY (anillo periwinkle), mini montos de
// movimientos y puntos de color de vencimientos. Clicable si hay algo que ver.
export default function DayCell({ day, movement, dues, isToday, isSelected, onClick }) {
  const hasMov = !!movement;
  const hasDue = dues && dues.length > 0;
  const clickable = hasMov || hasDue;
  return (
    <button
      onClick={() => clickable && onClick(day)}
      className={`aspect-square border rounded-sm p-xs flex flex-col text-left transition-colors ${clickable ? 'cursor-pointer hover:border-primary' : 'cursor-default'} ${isSelected ? 'border-primary bg-primary/10' : isToday ? 'border-primary/60 bg-surface-card' : 'border-border-subtle bg-surface-card'}`}
    >
      <span className={`font-mono-data text-mono-data ${isToday ? 'text-primary font-bold' : 'text-on-surface-variant'}`}>{day}</span>
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
        <div className="mt-auto flex flex-col gap-px">
          {movement.income > 0 && <span className="font-mono-data text-[7px] text-tertiary">+{Math.round(movement.income / 1000)}K</span>}
          {movement.expense > 0 && <span className="font-mono-data text-[7px] text-accent-error">−{Math.round(movement.expense / 1000)}K</span>}
        </div>
      )}
    </button>
  );
}
