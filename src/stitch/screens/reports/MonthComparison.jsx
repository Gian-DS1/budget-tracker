// Comparativa mes actual vs anterior por categoría: barra divergente + delta %.
import { formatCurrency } from '../../../utils/formatters';
import { useI18n } from '../../../contexts/I18nContext';
import { CHART } from '../../chartTokens';

const fmt = (n) => formatCurrency(n);

export default function MonthComparison({ data }) {
  const { t } = useI18n();
  const rows = (data || []).filter((d) => d.current > 0 || d.previous > 0).slice(0, 8);
  if (rows.length === 0) {
    return <p className="font-body-md text-body-md text-text-muted py-xl text-center">{t('screens.reports.needTwoMonths')}</p>;
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
                className="absolute top-0 bottom-0 rounded-full transition-all duration-500 ease-out motion-reduce:transition-none"
                style={{
                  background: up ? CHART.error : CHART.tertiary,
                  width: `${widthPct}%`,
                  left: up ? '50%' : `${50 - widthPct}%`,
                }}
              />
            </div>
            <span className={`font-mono-data text-mono-data shrink-0 w-[56px] text-right whitespace-nowrap ${up ? 'text-accent-error' : 'text-tertiary'}`}>
              {isNew ? t('screens.reports.newLabel') : `${up ? '+' : ''}${d.deltaPct.toFixed(0)}%`}
            </span>
            {/* Antes → ahora: el dato que permite verificar el % de un vistazo */}
            <span className="font-mono-data text-mono-data text-text-muted shrink-0 text-right whitespace-nowrap tabular-nums hidden sm:inline">
              {isNew ? fmt(d.current) : <>{fmt(d.previous)} <span className="text-text-muted/60">→</span> <span className="text-on-surface-variant">{fmt(d.current)}</span></>}
            </span>
          </div>
        );
      })}
    </div>
  );
}
