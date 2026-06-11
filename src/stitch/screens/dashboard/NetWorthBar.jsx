// Barra apilada ahorro vs deuda + patrimonio neto. Un segmento existente pero
// minúsculo recibe un piso visual (FLOOR%) para que nunca parezca un bug; sin
// deudas, la barra es 100% lima y la etiqueta celebra el estado.
import { formatCurrency } from '../../../utils/formatters';
import { EmptyCell } from './dashboardUi';
import { useScreenStrings } from '../../../i18n/useScreenStrings';
import CountUp from '../../CountUp';

const fmt = (n) => formatCurrency(n);
const FLOOR = 2; // % mínimo visible de un segmento con valor > 0

export default function NetWorthBar({ split }) {
  const strings = useScreenStrings();
  if (!split.hasData) return <EmptyCell icon="account_balance" message={strings.charts.noSavingsOrDebts} />;

  let savedW = split.savedPct;
  let debtW = split.debtPct;
  if (split.debt > 0 && debtW < FLOOR) { debtW = FLOOR; savedW = 100 - FLOOR; }
  if (split.saved > 0 && savedW < FLOOR) { savedW = FLOOR; debtW = 100 - FLOOR; }

  return (
    <div className="flex-grow flex flex-col justify-center gap-sm min-h-[80px]">
      <div className="flex justify-between items-baseline">
        <span className="font-mono-data text-mono-data text-text-muted uppercase">{strings.charts.netWorth}</span>
        <span className={`font-headline-md text-[20px] tracking-tight ${split.netWorth >= 0 ? 'text-tertiary' : 'text-accent-error'}`}><CountUp value={split.netWorth} format={fmt} /></span>
      </div>
      <div className="w-full h-3 rounded-full overflow-hidden flex bg-surface-container-highest">
        <div className="h-full bg-tertiary" style={{ width: `${savedW}%` }} />
        <div className="h-full bg-accent-error" style={{ width: `${debtW}%` }} />
      </div>
      <div className="flex justify-between font-mono-data text-mono-data">
        <span className="text-tertiary">{strings.charts.saved} {fmt(split.saved)}</span>
        {split.debt > 0
          ? <span className="text-accent-error">{strings.charts.debt} {fmt(split.debt)}</span>
          : <span className="text-tertiary">{strings.charts.debtFree}</span>}
      </div>
    </div>
  );
}
