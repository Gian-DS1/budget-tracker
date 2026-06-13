// Tarjeta de "sobre" del presupuesto base cero: categoría + estimado editable
// (StitchCurrencyInput, persiste on-blur) + gastado real + barra de progreso.
// La fila "gestionada" (managed: deuda) muestra la cuota como solo lectura, ya
// que su monto vive en el módulo Deudas (no es un sobre editable).
import { useEffect, useRef, useState } from 'react';
import MS from '../../MS';
import Emoji from '../../Emoji';
import StitchCurrencyInput from '../../StitchCurrencyInput';
import { Stagger } from '../../StitchMotion';
import { useI18n } from '../../../contexts/I18nContext';
import { formatCurrency } from '../../../utils/formatters';

const fmt = (n) => formatCurrency(n);

const typeColor = (t) =>
  ({ income: 'bg-tertiary', fixed_expense: 'bg-primary', variable_expense: 'bg-accent-warning', savings: 'bg-secondary' }[t] || 'bg-primary');

export default function EnvelopeRow({ cat, estimated, actual, pct, onSave, managed = false }) {
  const { t } = useI18n();
  // El input es controlado (onChange por tecla); persistimos solo al perder foco.
  const [v, setV] = useState(estimated ? String(estimated) : '');
  const focused = useRef(false);

  // Sincroniza el input cuando el estimado cambia DESDE FUERA (recarga de datos,
  // "copiar mes anterior", cambio de mes con misma key) — pero nunca mientras el
  // usuario está escribiendo, para no pisar su edición en curso. Esto evita que
  // el input conserve un monto rezagado y lo guarde en el período equivocado.
  useEffect(() => {
    if (!focused.current) setV(estimated ? String(estimated) : '');
  }, [estimated]);

  const over = pct > 100;

  return (
    <Stagger.Item className="bg-surface-card border border-border-subtle rounded p-md inner-glow flex flex-col gap-sm">
      <div className="flex justify-between items-center gap-sm">
        <span className="font-label-sm text-label-sm text-on-surface flex items-center gap-xs min-w-0">
          <Emoji e={cat.icon} size={16} /> <span className="truncate">{cat.name}</span>
        </span>
        {managed ? (
          <span
            className="shrink-0 inline-flex items-center gap-[3px] font-mono-data text-mono-data text-secondary uppercase tracking-wider border border-secondary/40 rounded-full px-[6px] py-[2px] leading-none"
            title={t('pages.manageFromDebtsModule')}
          >
            <MS name="link" className="!text-[11px] leading-none" /> {t('debts.title')}
          </span>
        ) : (
          <StitchCurrencyInput
            value={v}
            onChange={setV}
            onFocus={() => { focused.current = true; }}
            onBlur={() => { focused.current = false; onSave(v); }}
            placeholder="0"
            className="w-24 bg-surface-container-lowest border border-border-subtle rounded py-xs px-sm font-mono-data text-[11px] text-right text-on-surface focus:outline-none focus:border-primary inner-glow"
          />
        )}
      </div>
      <div className="flex justify-between items-baseline">
        <span className="font-mono-data text-[15px] text-on-background tracking-tight">{fmt(actual)}</span>
        <span className="font-mono-data text-mono-data text-text-muted">{t('screens.charts.of')} {fmt(estimated)}</span>
      </div>
      <div className="w-full h-1 bg-surface-container-highest rounded-full overflow-hidden">
        <div className={`h-full ${over ? 'bg-accent-error' : typeColor(cat.type)}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      {/* Lo accionable del sobre: cuánto queda (o cuánto se pasó). Solo cuando
          hay monto asignado; un sobre en 0 no tiene nada que reportar. */}
      {estimated > 0 && (
        <span className={`font-mono-data text-mono-data normal-case tracking-normal ${over ? 'text-accent-error' : 'text-text-muted'}`}>
          {over
            ? `${fmt(actual - estimated)} ${t('screens.budget.overAmount')}`
            : `${fmt(estimated - actual)} ${t('screens.budget.freeAmount')}`}
        </span>
      )}
    </Stagger.Item>
  );
}
