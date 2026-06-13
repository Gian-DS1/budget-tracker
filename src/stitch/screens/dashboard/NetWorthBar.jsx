// Mini barra de patrimonio para la fila de KPIs: ahorro vs deuda apilados +
// leyenda corta. (La celda grande se retiró: el patrimonio vive ahora como
// cuarto KPI y la columna del hero quedó completa para Salud financiera.)
// Un segmento existente pero minúsculo recibe un piso visual (FLOOR%) para que
// nunca parezca un bug; sin deudas, la barra es 100% lima.
import { formatCurrency } from '../../../utils/formatters';
import { useScreenStrings } from '../../../i18n/useScreenStrings';

const fmt = (n) => formatCurrency(n);
const FLOOR = 2; // % mínimo visible de un segmento con valor > 0

export default function NetWorthBar({ split }) {
  const strings = useScreenStrings();
  if (!split.hasData) return null;

  let savedW = split.savedPct;
  let debtW = split.debtPct;
  if (split.debt > 0 && debtW < FLOOR) { debtW = FLOOR; savedW = 100 - FLOOR; }
  if (split.saved > 0 && savedW < FLOOR) { savedW = FLOOR; debtW = 100 - FLOOR; }

  return (
    <div className="flex flex-col gap-xs">
      <div className="w-full h-1.5 rounded-full overflow-hidden flex bg-surface-container-highest">
        <div className="h-full bg-tertiary" style={{ width: `${savedW}%` }} />
        <div className="h-full bg-accent-error" style={{ width: `${debtW}%` }} />
      </div>
      <div className="flex justify-between gap-sm font-mono-data text-mono-data">
        <span className="text-tertiary truncate">{strings.charts.saved} {fmt(split.saved)}</span>
        {split.debt > 0
          ? <span className="text-accent-error truncate">{strings.charts.debt} {fmt(split.debt)}</span>
          : <span className="text-tertiary">{strings.charts.debtFree}</span>}
      </div>
    </div>
  );
}
