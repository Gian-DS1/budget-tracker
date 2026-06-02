// Deudas — estructura "Debt Architecture" de Stitch, español. (Datos demo; se
// cablea getTotalDebt / amortización real en su turno.)
import MS from '../MS';

const DEBTS = [
  { name: 'Hipoteca principal', apr: '3.2% TNA', aprC: 'text-text-muted', amt: '$420,000', amtC: 'text-on-surface', w: '65%', bar: 'bg-primary', paid: 'Pagado: $280K', rem: 'Restante: 15 años', warn: false },
  { name: 'Préstamo de equipo', apr: '8.5% TNA', aprC: 'text-accent-warning', amt: '$45,000', amtC: 'text-accent-warning', w: '30%', bar: 'bg-accent-warning', paid: 'Pagado: $15K', rem: 'Restante: 3 años', warn: true },
];

export default function StitchDebts() {
  return (
    <div className="p-margin-safe max-w-[1728px] mx-auto w-full">
      <div className="mb-xl flex flex-col md:flex-row md:items-end justify-between gap-lg">
        <div>
          <div className="flex items-center gap-sm mb-xs">
            <span className="w-2 h-2 rounded-full bg-accent-error error-dot" />
            <span className="font-mono-data text-mono-data text-accent-error uppercase tracking-wider">Pasivos activos</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Control de deudas</h1>
          <p className="font-body-md text-body-md text-text-muted mt-sm">Arquitectura de pasivos y estrategias de pago (avalancha / bola de nieve).</p>
        </div>
        <button className="bg-primary text-on-primary font-label-sm text-label-sm uppercase tracking-widest px-md py-sm rounded hover:bg-primary-container transition-colors inner-glow flex items-center gap-sm self-start">
          <MS name="add" className="text-[16px]" /> Nueva deuda
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-md">
        {DEBTS.map((d) => (
          <div key={d.name} className={`bg-surface-card border rounded-lg p-md inner-glow flex flex-col gap-md ${d.warn ? 'border-accent-warning/30' : 'border-border-subtle'}`}>
            <div className="flex justify-between items-center">
              <span className="font-label-sm text-label-sm uppercase text-on-surface">{d.name}</span>
              <span className={`font-mono-data text-mono-data ${d.aprC}`}>{d.apr}</span>
            </div>
            <div className={`font-headline-md text-headline-md ${d.amtC}`}>{d.amt}</div>
            <div className="w-full bg-surface-container-highest h-1 rounded-full overflow-hidden mt-sm">
              <div className={`h-full rounded-full ${d.bar}`} style={{ width: d.w }} />
            </div>
            <div className="flex justify-between font-mono-data text-mono-data text-text-muted mt-xs">
              <span>{d.paid}</span><span>{d.rem}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
