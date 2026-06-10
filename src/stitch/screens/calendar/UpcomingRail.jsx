// Panel "Próximos vencimientos": lista lo que viene en los próximos ~30 días.
import MS from '../../MS';
import { useI18n } from '../../../contexts/I18nContext';
import { formatCurrency, formatDate } from '../../../utils/formatters';

const fmt = (n) => formatCurrency(n);

export default function UpcomingRail({ items, onNavigate }) {
  const { t } = useI18n();
  return (
    <div className="bg-surface-panel border border-border-subtle rounded-lg inner-glow p-lg">
      <div className="flex justify-between items-center mb-md border-b border-border-subtle pb-sm">
        <h2 className="font-mono-data text-mono-data text-on-surface-variant uppercase flex items-center gap-xs">
          <MS name="upcoming" className="!text-[16px] text-text-muted" /> {t('screens.calendar.upcomingPayments')}
        </h2>
        <span className="font-mono-data text-mono-data text-text-muted">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <div className="py-lg flex flex-col items-center text-center gap-sm">
          <MS name="check_circle" className="text-[24px] text-tertiary" />
          <p className="font-body-md text-body-md text-text-muted">{t('screens.calendar.noUpcoming30')}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-sm">
          {items.map((it, i) => (
            <button key={i} onClick={() => it.to && onNavigate(it.to)} className="text-left group p-sm border border-border-subtle rounded hover:bg-surface-container-high transition-colors flex flex-col gap-xs">
              <div className="flex items-center justify-between gap-xs">
                <span className="flex items-center gap-xs min-w-0">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: it.color }} />
                  <span className="font-label-sm text-label-sm text-on-surface truncate">{it.label}</span>
                </span>
                <span className="font-mono-data text-mono-data text-text-muted shrink-0">{it.daysUntil === 0 ? t('calendar.today').toUpperCase() : t('dashboard.inDays').replace('{d}', it.daysUntil)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono-data text-mono-data text-text-muted">{formatDate(it.date)}</span>
                <span className="font-mono-data text-mono-data text-on-surface-variant">{fmt(it.amount)}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
