// Recordatorios: tarjetas clicables. Recibe la lista ya calculada y el navigate.
import MS from '../../MS';

export default function SignalsRail({ signals, onNavigate }) {
  if (!signals || signals.length === 0) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center text-center gap-sm py-lg">
        <MS name="check_circle" className="text-[24px] text-tertiary" />
        <p className="font-body-md text-body-md text-text-muted">Sin pagos próximos.</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-sm">
      {signals.map((s, i) => (
        <button key={i} onClick={() => s.to && onNavigate(s.to)} className="text-left group p-sm border border-border-subtle hover:bg-surface-container-high transition-all rounded flex flex-col gap-xs">
          <div className="flex justify-between items-center">
            <span className={`font-label-sm text-label-sm ${s.tc}`}>{s.tag}</span>
            <span className="font-mono-data text-mono-data text-text-muted">{s.t}</span>
          </div>
          <div className="font-body-md text-body-md text-on-surface-variant group-hover:text-on-surface">{s.body}</div>
        </button>
      ))}
    </div>
  );
}
