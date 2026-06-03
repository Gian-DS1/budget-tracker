// Barra apilada ahorro vs deuda + patrimonio neto.
import { formatCurrency } from '../../../utils/formatters';
import { EmptyCell } from './dashboardUi';

const fmt = (n) => formatCurrency(n);

export default function NetWorthBar({ split }) {
  if (!split.hasData) return <EmptyCell icon="account_balance" message="Aún sin ahorros ni deudas registrados." />;
  return (
    <div className="flex-grow flex flex-col justify-center gap-md min-h-[120px]">
      <div className="flex justify-between items-baseline">
        <span className="font-mono-data text-mono-data text-text-muted uppercase">Patrimonio neto</span>
        <span className={`font-headline-md text-[20px] tracking-tight ${split.netWorth >= 0 ? 'text-tertiary' : 'text-accent-error'}`}>{fmt(split.netWorth)}</span>
      </div>
      <div className="w-full h-3 rounded-full overflow-hidden flex bg-surface-container-highest">
        <div className="h-full bg-tertiary" style={{ width: `${split.savedPct}%` }} />
        <div className="h-full bg-accent-error" style={{ width: `${split.debtPct}%` }} />
      </div>
      <div className="flex justify-between font-mono-data text-mono-data">
        <span className="text-tertiary">Ahorro {fmt(split.saved)}</span>
        <span className="text-accent-error">Deuda {fmt(split.debt)}</span>
      </div>
    </div>
  );
}
