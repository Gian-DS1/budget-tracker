// Calendar — lenguaje Stitch (no hay pantalla Romer directa; coherente con el sistema).
import MS from '../MS';

const DOW = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
// 35 celdas demo: algunas con actividad (ingreso lima / gasto coral).
const CELLS = Array.from({ length: 35 }, (_, i) => {
  const day = i - 2; // offset para que el mes empiece en miércoles
  const inMonth = day >= 1 && day <= 31;
  const act = inMonth && [3, 7, 12, 15, 21, 28].includes(day);
  const income = [7, 21].includes(day);
  return { day, inMonth, act, income };
});

export default function StitchCalendar() {
  return (
    <div className="p-margin-safe max-w-[1728px] mx-auto w-full">
      <div className="flex items-center justify-between mb-xl">
        <div>
          <div className="flex items-center gap-sm mb-xs">
            <span className="w-2 h-2 rounded-full bg-secondary live-dot" />
            <span className="font-mono-data text-mono-data text-secondary uppercase tracking-wider">Period View</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">October 2024</h1>
        </div>
        <div className="flex gap-sm">
          <button className="w-9 h-9 flex items-center justify-center rounded border border-border-subtle text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-colors inner-glow"><MS name="chevron_left" className="text-[18px]" /></button>
          <button className="w-9 h-9 flex items-center justify-center rounded border border-border-subtle text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-colors inner-glow"><MS name="chevron_right" className="text-[18px]" /></button>
        </div>
      </div>

      <div className="bg-surface-panel border border-border-subtle rounded-lg inner-glow p-md grid-bg">
        <div className="grid grid-cols-7 gap-px mb-sm">
          {DOW.map((d) => (
            <div key={d} className="font-mono-data text-mono-data text-text-muted uppercase text-center py-sm">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px">
          {CELLS.map((c, i) => (
            <div key={i} className={`aspect-square border border-border-subtle rounded-sm p-xs flex flex-col ${c.inMonth ? 'bg-surface-card' : 'bg-transparent opacity-40'} ${c.act ? 'cursor-pointer hover:border-primary transition-colors' : ''}`}>
              {c.inMonth && (
                <>
                  <span className="font-mono-data text-mono-data text-on-surface-variant">{c.day}</span>
                  {c.act && (
                    <span className={`mt-auto font-mono-data text-[8px] ${c.income ? 'text-tertiary' : 'text-accent-error'}`}>
                      {c.income ? '+' : '−'}${(Math.abs(c.day) * 37).toLocaleString()}
                    </span>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
