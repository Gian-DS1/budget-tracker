// Panel "Análisis inteligente": recomendaciones priorizadas del motor getAnalysis.
// Cada tarjeta lleva color e ícono según severidad. Hover sutil.
import MS from '../../MS';
import { useI18n } from '../../../contexts/I18nContext';

const STYLE = {
  alert: { ring: 'border-accent-error/40', bar: 'bg-accent-error', icon: 'text-accent-error' },
  warn: { ring: 'border-accent-warning/40', bar: 'bg-accent-warning', icon: 'text-accent-warning' },
  good: { ring: 'border-tertiary/40', bar: 'bg-tertiary', icon: 'text-tertiary' },
  info: { ring: 'border-border-subtle', bar: 'bg-primary', icon: 'text-primary' },
};

export default function AnalysisPanel({ insights }) {
  const { t } = useI18n();
  if (!insights || insights.length === 0) return null;
  return (
    <div className="bg-surface-panel border border-border-subtle rounded-lg inner-glow p-lg">
      <div className="flex justify-between items-center mb-md border-b border-border-subtle pb-sm">
        <h2 className="font-mono-data text-mono-data text-on-surface-variant uppercase flex items-center gap-xs">
          <MS name="neurology" className="!text-[16px] text-primary" /> {t('screens.reports.smartAnalysis')}
        </h2>
        <span className="font-mono-data text-mono-data text-text-muted">{insights.length} {insights.length === 1 ? t('screens.reports.findingOne') : t('screens.reports.findingMany')}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
        {insights.map((it, i) => {
          const s = STYLE[it.severity] || STYLE.info;
          return (
            <div key={i} className={`relative overflow-hidden rounded border ${s.ring} bg-surface-container-lowest p-md pl-[18px] flex gap-sm hover:bg-surface-container-high transition-colors`}>
              <span className={`absolute left-0 top-0 bottom-0 w-1 ${s.bar}`} />
              <MS name={it.icon} className={`!text-[18px] shrink-0 mt-px ${s.icon}`} />
              <div className="flex flex-col gap-xs min-w-0">
                <span className="font-label-sm text-label-sm text-on-surface">{it.title}</span>
                <span className="font-body-md text-body-md text-on-surface-variant normal-case tracking-normal">{it.body}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
