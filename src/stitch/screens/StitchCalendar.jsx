// Calendario — centro de planificación: movimientos pasados + vencimientos
// futuros + próximos pagos. Lógica pura en calendar/selectors.js. Solo lectura.
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import MS from '../MS';
import { Stagger } from '../StitchMotion';
import StitchSelect from '../StitchSelect';
import CountUp from '../CountUp';
import useTransactionStore from '../../stores/useTransactionStore';
import useCategoryStore from '../../stores/useCategoryStore';
import useDebtStore from '../../stores/useDebtStore';
import useCreditCardStore from '../../stores/useCreditCardStore';
import useSavingsStore from '../../stores/useSavingsStore';
import useRecurringStore from '../../stores/useRecurringStore';
import { formatCurrency } from '../../utils/formatters';
import { MONTHS_ES, DAYS_SHORT_ES } from '../../utils/constants';
import { getDayMovements, getDueEvents, getMonthSummary, getUpcoming } from './calendar/selectors';
import DayCell from './calendar/DayCell';
import DayDetail from './calendar/DayDetail';
import UpcomingRail from './calendar/UpcomingRail';

const fmt = (n) => formatCurrency(n);
const LEGEND = [
  { c: '#ffb4ab', l: 'Deuda' }, { c: '#ffb689', l: 'Tarjeta' },
  { c: '#bdd200', l: 'Meta' }, { c: '#50d8e9', l: 'Recurrente' },
];

export default function StitchCalendar() {
  const navigate = useNavigate();
  const { transactions } = useTransactionStore();
  const { categories } = useCategoryStore();
  const debts = useDebtStore((s) => s.debts);
  const cards = useCreditCardStore((s) => s.cards);
  const goals = useSavingsStore((s) => s.goals);
  const recurring = useRecurringStore((s) => s.recurring);

  const now = useMemo(() => new Date(), []);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState(null);

  const navMonth = (dir) => {
    let mm = month + dir, yy = year;
    if (mm < 0) { mm = 11; yy--; } else if (mm > 11) { mm = 0; yy++; }
    setMonth(mm); setYear(yy); setSelected(null);
  };

  const movements = useMemo(() => getDayMovements(transactions, year, month), [transactions, year, month]);
  const dueEvents = useMemo(() => getDueEvents({ debts, cards, goals, recurring }, year, month, now, transactions), [debts, cards, goals, recurring, year, month, now, transactions]);
  const summary = useMemo(() => getMonthSummary(transactions, year, month), [transactions, year, month]);
  const upcoming = useMemo(() => getUpcoming({ debts, cards, goals, recurring }, now, transactions, 30), [debts, cards, goals, recurring, now, transactions]);

  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
  const todayDay = now.getDate();
  const selectedISO = selected ? `${year}-${String(month + 1).padStart(2, '0')}-${String(selected).padStart(2, '0')}` : null;

  const monthOptions = MONTHS_ES.map((label, i) => ({ value: String(i), label }));
  const yearOptions = [];
  for (let yy = now.getFullYear() + 1; yy >= now.getFullYear() - 5; yy--) yearOptions.push({ value: String(yy), label: String(yy) });

  return (
    <div className="p-md sm:p-margin-safe max-w-[1728px] mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-lg mb-xl">
        <div>
          <div className="flex items-center gap-sm mb-xs">
            <span className="w-2 h-2 rounded-full bg-secondary live-dot" />
            <span className="font-mono-data text-mono-data text-secondary uppercase tracking-wider">Vista mensual</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">{MONTHS_ES[month]} {year}</h1>
        </div>
        <div className="flex items-center gap-sm self-start">
          <div className="w-[140px]"><StitchSelect value={String(month)} onChange={(v) => { setMonth(Number(v)); setSelected(null); }} options={monthOptions} compact /></div>
          <div className="w-[100px]"><StitchSelect value={String(year)} onChange={(v) => { setYear(Number(v)); setSelected(null); }} options={yearOptions} compact /></div>
          <button onClick={() => navMonth(-1)} className="w-9 h-9 flex items-center justify-center rounded border border-border-subtle text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-colors inner-glow"><MS name="chevron_left" className="text-[18px]" /></button>
          <button onClick={() => navMonth(1)} className="w-9 h-9 flex items-center justify-center rounded border border-border-subtle text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-colors inner-glow"><MS name="chevron_right" className="text-[18px]" /></button>
        </div>
      </div>

      <Stagger className="flex flex-col gap-gutter">
        {/* Resumen del mes */}
        <Stagger.Item className="grid grid-cols-3 gap-md">
          <div className="bg-surface-panel border border-border-subtle rounded-lg inner-glow p-md flex flex-col gap-xs">
            <span className="font-mono-data text-mono-data text-text-muted uppercase">Ingresos</span>
            <span className="font-headline-md text-[20px] tracking-tight text-tertiary whitespace-nowrap"><CountUp value={summary.income} format={(n) => `+${fmt(n)}`} /></span>
          </div>
          <div className="bg-surface-panel border border-border-subtle rounded-lg inner-glow p-md flex flex-col gap-xs">
            <span className="font-mono-data text-mono-data text-text-muted uppercase">Gastos</span>
            <span className="font-headline-md text-[20px] tracking-tight text-accent-error whitespace-nowrap"><CountUp value={summary.expense} format={(n) => `−${fmt(n)}`} /></span>
          </div>
          <div className="bg-surface-panel border border-border-subtle rounded-lg inner-glow p-md flex flex-col gap-xs">
            <span className="font-mono-data text-mono-data text-text-muted uppercase">Balance</span>
            <span className={`font-headline-md text-[20px] tracking-tight whitespace-nowrap ${summary.balance >= 0 ? 'text-on-surface' : 'text-accent-error'}`}><CountUp value={summary.balance} format={(n) => `${n >= 0 ? '+' : '−'}${fmt(Math.abs(n))}`} /></span>
          </div>
        </Stagger.Item>

        {/* Grid + detalle */}
        <Stagger.Item className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
          <div className="lg:col-span-2 bg-surface-panel border border-border-subtle rounded-lg inner-glow p-md">
            <div className="grid grid-cols-7 gap-px mb-sm">
              {DAYS_SHORT_ES.map((d) => <div key={d} className="font-mono-data text-mono-data text-text-muted uppercase text-center py-sm">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-px">
              {cells.map((d, i) => d === null
                ? <div key={i} className="aspect-square" />
                : <DayCell key={i} day={d} movement={movements[d]} dues={dueEvents[d]} isToday={isCurrentMonth && d === todayDay} isSelected={selected === d} onClick={(day) => setSelected(selected === day ? null : day)} />)}
            </div>
            {/* Leyenda */}
            <div className="flex flex-wrap gap-md mt-md pt-sm border-t border-border-subtle">
              {LEGEND.map((x) => (
                <span key={x.l} className="flex items-center gap-xs font-mono-data text-mono-data text-text-muted">
                  <span className="w-2 h-2 rounded-full" style={{ background: x.c }} /> {x.l}
                </span>
              ))}
            </div>
          </div>

          <DayDetail iso={selectedISO} movement={selected ? movements[selected] : null} dues={selected ? dueEvents[selected] : null} categories={categories} />
        </Stagger.Item>

        {/* Próximos vencimientos */}
        <Stagger.Item>
          <UpcomingRail items={upcoming} onNavigate={navigate} />
        </Stagger.Item>
      </Stagger>
    </div>
  );
}
