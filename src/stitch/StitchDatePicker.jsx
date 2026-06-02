// Date picker custom — calendario propio con el MISMO panel animado y colores
// del tema que los dropdowns (StitchSelect / StitchCategorySelect). Reemplaza al
// <input type="date"> nativo para tener animación y diseño 100% consistentes.
//
// Trabaja en ISO local 'YYYY-MM-DD' (sin UTC, para no correr el día en GMT-4).
//
// API: <StitchDatePicker
//         value={iso|''} onChange={(iso)=>...} min={iso} max={iso}
//         placeholder compact className id />

import { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import MS from './MS';
import { MONTHS_ES, MONTHS_SHORT_ES } from '../utils/constants';
import { TRIGGER_BASE, TRIGGER_COMPACT, panelMotion, PANEL_CLS } from './dropdownShared';

// Lunes primero (convención local).
const WEEK = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

const pad = (n) => String(n).padStart(2, '0');
const toISO = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
// Parse 'YYYY-MM-DD' a {y,m,d} en horario local (m: 0-based).
function parseISO(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m: m - 1, d };
}
// Texto mostrado en el trigger: "2 jun 2026".
function labelOf(iso) {
  const p = parseISO(iso);
  if (!p) return '';
  return `${p.d} ${MONTHS_SHORT_ES[p.m].toLowerCase()} ${p.y}`;
}
// Índice de columna (0=Lunes) del primer día del mes.
function firstWeekday(y, m) {
  const js = new Date(y, m, 1).getDay(); // 0=Dom
  return (js + 6) % 7; // 0=Lun
}
const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();

export default function StitchDatePicker({
  value = '',
  onChange,
  min = '',
  max = '',
  placeholder = 'dd/mm/aaaa',
  compact = false,
  className = '',
  id,
}) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  // Mes/año que se está viendo en el calendario (no es el valor seleccionado).
  const today = new Date();
  const initial = parseISO(value) || { y: today.getFullYear(), m: today.getMonth(), d: today.getDate() };
  const [viewY, setViewY] = useState(initial.y);
  const [viewM, setViewM] = useState(initial.m);
  const gridId = useId();

  const sel = parseISO(value);
  const minP = parseISO(min);
  const maxP = parseISO(max);

  const openCal = () => {
    // Al abrir, salta al mes del valor seleccionado (o al actual).
    const base = parseISO(value) || { y: today.getFullYear(), m: today.getMonth() };
    setViewY(base.y); setViewM(base.m);
    setOpen(true);
  };
  const close = () => setOpen(false);
  const toggle = () => (open ? close() : openCal());

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDocClick); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const prevMonth = () => { if (viewM === 0) { setViewM(11); setViewY((y) => y - 1); } else setViewM((m) => m - 1); };
  const nextMonth = () => { if (viewM === 11) { setViewM(0); setViewY((y) => y + 1); } else setViewM((m) => m + 1); };

  // ¿Está el día fuera del rango permitido [min, max]?
  const disabled = (iso) => {
    if (minP && iso < min) return true;
    if (maxP && iso > max) return true;
    return false;
  };

  const pick = (d) => {
    const iso = toISO(viewY, viewM, d);
    if (disabled(iso)) return;
    onChange(iso);
    close();
  };

  // Construye la cuadrícula del mes (celdas vacías al inicio + días).
  const lead = firstWeekday(viewY, viewM);
  const total = daysInMonth(viewY, viewM);
  const cells = [...Array(lead).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)];

  const isToday = (d) => d === today.getDate() && viewM === today.getMonth() && viewY === today.getFullYear();
  const isSel = (d) => sel && d === sel.d && viewM === sel.m && viewY === sel.y;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        id={id}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={toggle}
        className={compact ? TRIGGER_COMPACT : TRIGGER_BASE}
      >
        <span className="flex items-center gap-sm min-w-0">
          <MS name="calendar_today" className={`${compact ? 'text-[14px]' : 'text-[16px]'} text-text-muted`} />
          <span className={`truncate font-mono-data ${value ? 'text-on-surface' : 'text-text-muted'}`}>
            {value ? labelOf(value) : placeholder}
          </span>
        </span>
        {value && !disabled(value) && (
          <MS
            name="close"
            role="button"
            tabIndex={0}
            aria-label="Limpiar fecha"
            onClick={(e) => { e.stopPropagation(); onChange(''); }}
            className="text-[15px] text-text-muted hover:text-on-surface"
          />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div role="dialog" id={gridId} {...panelMotion(reduce)} className={`${PANEL_CLS} w-[260px] p-sm`}>
            {/* Cabecera: mes/año + navegación */}
            <div className="flex items-center justify-between mb-sm px-xs">
              <button type="button" onClick={prevMonth} aria-label="Mes anterior" className="w-7 h-7 flex items-center justify-center rounded text-text-muted hover:text-on-surface hover:bg-surface-container-high transition-colors">
                <MS name="chevron_left" className="text-[18px]" />
              </button>
              <span className="font-label-sm text-label-sm text-on-surface font-medium">
                {MONTHS_ES[viewM]} {viewY}
              </span>
              <button type="button" onClick={nextMonth} aria-label="Mes siguiente" className="w-7 h-7 flex items-center justify-center rounded text-text-muted hover:text-on-surface hover:bg-surface-container-high transition-colors">
                <MS name="chevron_right" className="text-[18px]" />
              </button>
            </div>

            {/* Encabezado de días */}
            <div className="grid grid-cols-7 gap-0.5 mb-0.5">
              {WEEK.map((d, i) => (
                <div key={i} className="h-7 flex items-center justify-center font-mono-data text-[9px] text-text-muted uppercase">{d}</div>
              ))}
            </div>

            {/* Días */}
            <div className="grid grid-cols-7 gap-0.5">
              {cells.map((d, i) => {
                if (d === null) return <div key={`e${i}`} className="h-7" />;
                const iso = toISO(viewY, viewM, d);
                const dis = disabled(iso);
                const selDay = isSel(d);
                const todayDay = isToday(d);
                return (
                  <button
                    key={d}
                    type="button"
                    disabled={dis}
                    onClick={() => pick(d)}
                    className={[
                      'h-7 rounded flex items-center justify-center font-mono-data text-[11px] transition-colors',
                      dis ? 'text-text-muted/30 cursor-not-allowed' : 'hover:bg-surface-container-high cursor-pointer',
                      selDay ? 'bg-primary text-on-primary font-bold hover:bg-primary' : 'text-on-surface',
                      !selDay && todayDay ? 'ring-1 ring-inset ring-primary/60 text-primary' : '',
                    ].join(' ')}
                  >
                    {d}
                  </button>
                );
              })}
            </div>

            {/* Acción rápida: hoy */}
            <div className="flex justify-between items-center mt-sm pt-sm border-t border-border-subtle px-xs">
              <button
                type="button"
                onClick={() => {
                  const iso = toISO(today.getFullYear(), today.getMonth(), today.getDate());
                  if (disabled(iso)) return;
                  onChange(iso);
                  close();
                }}
                disabled={disabled(toISO(today.getFullYear(), today.getMonth(), today.getDate()))}
                className="font-mono-data text-[10px] uppercase tracking-wider text-primary hover:underline disabled:text-text-muted/40 disabled:no-underline"
              >
                Hoy
              </button>
              {value && (
                <button type="button" onClick={() => { onChange(''); close(); }} className="font-mono-data text-[10px] uppercase tracking-wider text-text-muted hover:text-on-surface">
                  Limpiar
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
