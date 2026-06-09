// Barra apilada ahorro vs deuda + patrimonio neto.
import { formatCurrency } from '../../../utils/formatters';
import { EmptyCell } from './dashboardUi';
import { useScreenStrings } from '../../../i18n/useScreenStrings';
import CountUp from '../../CountUp';

const fmt = (n) => formatCurrency(n);

export default function NetWorthBar({ split }) {
  const strings = useScreenStrings();
  if (!split.hasData) return <EmptyCell icon="account_balance" message={strings.charts.noMovements || 'Aún sin ahorros ni deudas registrados.'} />;
  return (
    <div className="flex-grow flex flex-col justify-center gap-sm min-h-[80px]">
      <div className="flex justify-between items-baseline">
        <span className="font-mono-data text-mono-data text-text-muted uppercase">{strings.charts.netWorth}</span>
        <span className={`font-headline-md text-[20px] tracking-tight ${split.netWorth >= 0 ? 'text-tertiary' : 'text-accent-error'}`}><CountUp value={split.netWorth} format={fmt} /></span>
      </div>
      <div className="w-full h-3 rounded-full overflow-hidden flex bg-surface-container-highest">
        <div className="h-full bg-tertiary" style={{ width: `${split.savedPct}%` }} />
        <div className="h-full bg-accent-error" style={{ width: `${split.debtPct}%` }} />
      </div>
      <div className="flex justify-between font-mono-data text-mono-data">
        <span className="text-tertiary">{strings.charts.saved} {fmt(split.saved)}</span>
        <span className="text-accent-error">{strings.charts.debt} {fmt(split.debt)}</span>
      </div>
    </div>
  );
}
