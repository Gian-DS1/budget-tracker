// Calendario — vista mensual con DATOS REALES (días con actividad).
import { useState, useMemo } from 'react';
import MS from '../MS';
import useTransactionStore from '../../stores/useTransactionStore';
import useCategoryStore from '../../stores/useCategoryStore';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { MONTHS_ES, DAYS_SHORT_ES } from '../../utils/constants';

const fmt = (n) => formatCurrency(n);

export default function StitchCalendar() {
  const { transactions } = useTransactionStore();
  const { categories } = useCategoryStore();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState(null);

  const navMonth = (dir) => {
    let mm = month + dir, yy = year;
    if (mm < 0) { mm = 11; yy--; } else if (mm > 11) { mm = 0; yy++; }
    setMonth(mm); setYear(yy); setSelected(null);
  };

  // Mapa día → {income, expense}
  const dayMap = useMemo(() => {
    const map = {};
    transactions.forEach((t) => {
      const d = new Date(t.date + 'T00:00:00');
      if (d.getFullYear() !== year || d.getMonth() !== month) return;
      const day = d.getDate();
      if (!map[day]) map[day] = { income: 0, expense: 0 };
      if (t.type === 'income') map[day].income += Number(t.amount);
      else if (['expense', 'fixed_expense', 'variable_expense'].includes(t.type)) map[day].expense += Number(t.amount) - Number(t.cashbackEarned || 0);
    });
    return map;
  }, [transactions, year, month]);

  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const selectedISO = selected ? `${year}-${String(month + 1).padStart(2, '0')}-${String(selected).padStart(2, '0')}` : null;
  const selectedTx = useMemo(() => selectedISO ? transactions.filter((t) => t.date === selectedISO) : [], [selectedISO, transactions]);
  const catName = (id) => { const c = categories.find((x) => x.id === id); return c ? `${c.icon} ${c.name}` : '—'; };

  return (
    <div className="p-margin-safe max-w-[1728px] mx-auto w-full">
      <div className="flex items-center justify-between mb-xl">
        <div>
          <div className="flex items-center gap-sm mb-xs">
            <span className="w-2 h-2 rounded-full bg-secondary live-dot" />
            <span className="font-mono-data text-mono-data text-secondary uppercase tracking-wider">Vista mensual</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">{MONTHS_ES[month]} {year}</h1>
        </div>
        <div className="flex gap-sm">
          <button onClick={() => navMonth(-1)} className="w-9 h-9 flex items-center justify-center rounded border border-border-subtle text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-colors inner-glow"><MS name="chevron_left" className="text-[18px]" /></button>
          <button onClick={() => navMonth(1)} className="w-9 h-9 flex items-center justify-center rounded border border-border-subtle text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-colors inner-glow"><MS name="chevron_right" className="text-[18px]" /></button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
        {/* Grid */}
        <div className="lg:col-span-2 bg-surface-panel border border-border-subtle rounded-lg inner-glow p-md grid-bg">
          <div className="grid grid-cols-7 gap-px mb-sm">
            {DAYS_SHORT_ES.map((d) => <div key={d} className="font-mono-data text-mono-data text-text-muted uppercase text-center py-sm">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-px">
            {cells.map((d, i) => {
              if (d === null) return <div key={i} className="aspect-square" />;
              const act = dayMap[d];
              const isSel = selected === d;
              return (
                <button key={i} onClick={() => act && setSelected(isSel ? null : d)} className={`aspect-square border rounded-sm p-xs flex flex-col text-left transition-colors ${act ? 'cursor-pointer hover:border-primary' : 'cursor-default'} ${isSel ? 'border-primary bg-primary/10' : 'border-border-subtle bg-surface-card'}`}>
                  <span className="font-mono-data text-mono-data text-on-surface-variant">{d}</span>
                  {act && (
                    <div className="mt-auto flex flex-col gap-px">
                      {act.income > 0 && <span className="font-mono-data text-[7px] text-tertiary">+{Math.round(act.income / 1000)}K</span>}
                      {act.expense > 0 && <span className="font-mono-data text-[7px] text-accent-error">−{Math.round(act.expense / 1000)}K</span>}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Detalle del día */}
        <div className="bg-surface-panel border border-border-subtle rounded-lg inner-glow p-lg">
          <div className="flex justify-between items-center mb-lg border-b border-border-subtle pb-sm">
            <h2 className="font-mono-data text-mono-data text-on-surface-variant">{selected ? formatDate(selectedISO).toUpperCase() : 'SELECCIONA UN DÍA'}</h2>
            <MS name="event" className="text-text-muted text-[16px]" />
          </div>
          {!selected ? (
            <p className="font-body-md text-body-md text-text-muted py-lg text-center">Toca un día con actividad para ver sus movimientos.</p>
          ) : selectedTx.length === 0 ? (
            <p className="font-body-md text-body-md text-text-muted py-lg text-center">Sin movimientos este día.</p>
          ) : (
            <div className="flex flex-col gap-sm">
              {selectedTx.map((t) => {
                const inc = t.type === 'income';
                return (
                  <div key={t.id} className="flex justify-between items-center bg-surface-card border border-border-subtle rounded p-sm inner-glow">
                    <div className="flex flex-col min-w-0">
                      <span className="font-label-sm text-label-sm text-on-surface truncate">{t.description || '—'}</span>
                      <span className="font-mono-data text-mono-data text-text-muted">{catName(t.categoryId)}</span>
                    </div>
                    <span className={`font-mono-data text-[13px] tabular-nums ml-sm ${inc ? 'text-tertiary' : 'text-on-surface'}`}>{inc ? '+' : '−'}{fmt(Math.abs(Number(t.amount)))}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
