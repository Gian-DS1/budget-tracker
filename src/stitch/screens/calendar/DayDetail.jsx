// Panel del día seleccionado: secciones Movimientos y Vencimientos + total.
import MS from '../../MS';
import Emoji from '../../Emoji';
import { useI18n } from '../../../contexts/I18nContext';
import { formatCurrency, formatDate } from '../../../utils/formatters';

const fmt = (n) => formatCurrency(n);

// El selector emite tipos internos en español; aquí se mapean a claves i18n.
const TYPE_KEY = { deuda: 'typeDebt', tarjeta: 'typeCard', meta: 'typeGoal', recurrente: 'typeRecurring' };

export default function DayDetail({ iso, movement, dues, categories }) {
  const { t } = useI18n();
  const txs = movement?.list || [];
  const events = dues || [];
  const catCell = (id) => {
    const c = categories.find((x) => x.id === id);
    if (!c) return '—';
    return <span className="inline-flex items-center gap-xs"><Emoji e={c.icon} size={13} />{c.name}</span>;
  };
  const dayTotal = (movement?.income || 0) - (movement?.expense || 0);

  return (
    <div className="bg-surface-panel border border-border-subtle rounded-lg inner-glow p-lg">
      <div className="flex justify-between items-center mb-lg border-b border-border-subtle pb-sm">
        <h2 className="font-mono-data text-mono-data text-on-surface-variant">{iso ? formatDate(iso).toUpperCase() : t('screens.calendar.selectDayTitle').toUpperCase()}</h2>
        <MS name="event" className="!text-[16px] text-text-muted" />
      </div>

      {!iso ? (
        <p className="font-body-md text-body-md text-text-muted py-lg text-center">{t('screens.calendar.tapDay')}</p>
      ) : (txs.length === 0 && events.length === 0) ? (
        <p className="font-body-md text-body-md text-text-muted py-lg text-center">{t('screens.calendar.nothingThisDay')}</p>
      ) : (
        <div className="flex flex-col gap-lg">
          {events.length > 0 && (
            <div className="flex flex-col gap-sm">
              <span className="font-mono-data text-mono-data text-text-muted uppercase">{t('screens.calendar.dueDates')}</span>
              {events.map((e, i) => (
                <div key={i} className="flex justify-between items-center bg-surface-card border border-border-subtle rounded p-sm inner-glow">
                  <span className="flex items-center gap-xs min-w-0">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: e.color }} />
                    <span className="font-label-sm text-label-sm text-on-surface truncate">{e.label}</span>
                    <span className="font-mono-data text-[8px] text-text-muted uppercase shrink-0">{TYPE_KEY[e.type] ? t(`screens.calendar.${TYPE_KEY[e.type]}`) : e.type}</span>
                  </span>
                  <span className="font-mono-data text-[13px] tabular-nums ml-sm text-on-surface-variant">{fmt(e.amount)}</span>
                </div>
              ))}
            </div>
          )}
          {txs.length > 0 && (
            <div className="flex flex-col gap-sm">
              <span className="font-mono-data text-mono-data text-text-muted uppercase">{t('screens.calendar.movements')}</span>
              {txs.map((t) => {
                const inc = t.type === 'income';
                return (
                  <div key={t.id} className="flex justify-between items-center bg-surface-card border border-border-subtle rounded p-sm inner-glow">
                    <div className="flex flex-col min-w-0">
                      <span className="font-label-sm text-label-sm text-on-surface truncate">{t.description || '—'}</span>
                      <span className="font-mono-data text-mono-data text-text-muted">{catCell(t.categoryId)}</span>
                    </div>
                    <span className={`font-mono-data text-[13px] tabular-nums ml-sm ${inc ? 'text-tertiary' : 'text-on-surface'}`}>{inc ? '+' : '−'}{fmt(Math.abs(Number(t.amount)))}</span>
                  </div>
                );
              })}
              <div className="flex justify-between items-center pt-xs border-t border-border-subtle">
                <span className="font-mono-data text-mono-data text-text-muted uppercase">{t('screens.calendar.dayBalance')}</span>
                <span className={`font-mono-data text-[13px] tabular-nums ${dayTotal >= 0 ? 'text-tertiary' : 'text-accent-error'}`}>{dayTotal >= 0 ? '+' : '−'}{fmt(Math.abs(dayTotal))}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
